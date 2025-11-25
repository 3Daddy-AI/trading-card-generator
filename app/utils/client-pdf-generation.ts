import { PDFDocument, rgb, PageSizes } from 'pdf-lib';

// 標準トレカサイズ (63mm x 88mm)
const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;

// A4サイズ (横向き)
const MM_TO_PT = 2.83465;
const PAGE_WIDTH = PageSizes.A4[1]; // 841.89pt (297mm)
const PAGE_HEIGHT = PageSizes.A4[0]; // 595.28pt (210mm)

const CARD_WIDTH_PT = CARD_WIDTH_MM * MM_TO_PT;
const CARD_HEIGHT_PT = CARD_HEIGHT_MM * MM_TO_PT;

const COLS = 4;
const ROWS = 2;
const CARDS_PER_PAGE = COLS * ROWS;

const TOTAL_GRID_WIDTH = CARD_WIDTH_PT * COLS;
const TOTAL_GRID_HEIGHT = CARD_HEIGHT_PT * ROWS;

const MARGIN_X = (PAGE_WIDTH - TOTAL_GRID_WIDTH) / 2;
const MARGIN_Y = (PAGE_HEIGHT - TOTAL_GRID_HEIGHT) / 2;

export async function generateTradingCardPdfs(
    frontFile: File,
    backFile: File
): Promise<{ frontPdf: Uint8Array; backPdf: Uint8Array }> {
    console.log('Starting PDF generation...');
    let currentStep = '初期化';

    try {
        // 1. ファイルを読み込む
        currentStep = 'ファイル読み込み';
        console.log('Reading files as ArrayBuffer...');
        const frontArrayBuffer = await frontFile.arrayBuffer();
        const backArrayBuffer = await backFile.arrayBuffer();

        // Uint8Arrayに変換（pdf-libの安定性向上のため）
        const frontUint8Array = new Uint8Array(frontArrayBuffer);
        const backUint8Array = new Uint8Array(backArrayBuffer);

        console.log(`Files read successfully. Front: ${frontUint8Array.length} bytes, Back: ${backUint8Array.length} bytes`);

        // 2. PDFをロード
        currentStep = 'PDF解析（表面）';
        console.log('Loading Front PDF document...');
        const frontSrcDoc = await PDFDocument.load(frontUint8Array, { ignoreEncryption: true });

        currentStep = 'PDF解析（裏面）';
        console.log('Loading Back PDF document...');
        const backSrcDoc = await PDFDocument.load(backUint8Array, { ignoreEncryption: true });
        console.log('PDF documents loaded.');

        // 3. 出力用PDFを作成
        currentStep = '出力用PDF作成';
        console.log('Creating output documents...');
        const frontOutDoc = await PDFDocument.create();
        const backOutDoc = await PDFDocument.create();

        const totalCards = frontSrcDoc.getPageCount();
        const totalOutPages = Math.ceil(totalCards / CARDS_PER_PAGE);
        console.log(`Total cards: ${totalCards}, Total output pages: ${totalOutPages}`);

        // 裏面の1ページ目を取得
        currentStep = '裏面ページ埋め込み準備';
        console.log('Embedding back page...');
        const [backSrcPage] = await backOutDoc.embedPages([backSrcDoc.getPages()[0]]);

        // 4. ページ生成ループ
        currentStep = 'ページ生成ループ';
        for (let p = 0; p < totalOutPages; p++) {
            console.log(`Processing page ${p + 1}/${totalOutPages}...`);
            const frontPage = frontOutDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            const backPage = backOutDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

            drawGridLines(frontPage);
            drawGridLines(backPage);

            for (let i = 0; i < CARDS_PER_PAGE; i++) {
                const cardIndex = p * CARDS_PER_PAGE + i;
                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const x = MARGIN_X + col * CARD_WIDTH_PT;
                const y = PAGE_HEIGHT - MARGIN_Y - (row + 1) * CARD_HEIGHT_PT;

                // 表面カードの配置
                if (cardIndex < totalCards) {
                    try {
                        currentStep = `表面カード配置 (${cardIndex + 1}枚目)`;
                        const [frontSrcPage] = await frontOutDoc.embedPages([frontSrcDoc.getPages()[cardIndex]]);

                        const scale = Math.min(
                            CARD_WIDTH_PT / frontSrcPage.width,
                            CARD_HEIGHT_PT / frontSrcPage.height
                        );

                        const xOffset = (CARD_WIDTH_PT - frontSrcPage.width * scale) / 2;
                        const yOffset = (CARD_HEIGHT_PT - frontSrcPage.height * scale) / 2;

                        frontPage.drawPage(frontSrcPage, {
                            x: x + xOffset,
                            y: y + yOffset,
                            width: frontSrcPage.width * scale,
                            height: frontSrcPage.height * scale,
                        });
                    } catch (embedError) {
                        console.error(`Error embedding card ${cardIndex}:`, embedError);
                        throw new Error(`カード ${cardIndex + 1}枚目の処理中にエラー: ${embedError instanceof Error ? embedError.message : String(embedError)}`);
                    }
                }

                // 裏面カードの配置
                currentStep = `裏面カード配置 (ページ${p + 1}, 枠${i + 1})`;
                const backScale = Math.min(
                    CARD_WIDTH_PT / backSrcPage.width,
                    CARD_HEIGHT_PT / backSrcPage.height
                );

                const backXOffset = (CARD_WIDTH_PT - backSrcPage.width * backScale) / 2;
                const backYOffset = (CARD_HEIGHT_PT - backSrcPage.height * backScale) / 2;

                backPage.drawPage(backSrcPage, {
                    x: x + backXOffset,
                    y: y + backYOffset,
                    width: backSrcPage.width * backScale,
                    height: backSrcPage.height * backScale,
                });
            }
        }

        // 5. 保存
        currentStep = 'PDF保存処理';
        console.log('Saving PDFs...');
        const frontPdfBytes = await frontOutDoc.save();
        const backPdfBytes = await backOutDoc.save();
        console.log('PDFs saved successfully.');

        return {
            frontPdf: frontPdfBytes,
            backPdf: backPdfBytes,
        };

    } catch (error) {
        console.error(`Error in step "${currentStep}":`, error);
        // エラーメッセージにステップ名を含める
        if (error instanceof Error) {
            error.message = `[${currentStep}] ${error.message}`;
        }
        throw error;
    }
}

function drawGridLines(page: any) {
    for (let r = 0; r <= ROWS; r++) {
        const y = PAGE_HEIGHT - MARGIN_Y - r * CARD_HEIGHT_PT;
        page.drawLine({
            start: { x: MARGIN_X, y },
            end: { x: MARGIN_X + TOTAL_GRID_WIDTH, y },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        });
    }

    for (let c = 0; c <= COLS; c++) {
        const x = MARGIN_X + c * CARD_WIDTH_PT;
        page.drawLine({
            start: { x, y: PAGE_HEIGHT - MARGIN_Y },
            end: { x, y: PAGE_HEIGHT - MARGIN_Y - TOTAL_GRID_HEIGHT },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        });
    }
}
