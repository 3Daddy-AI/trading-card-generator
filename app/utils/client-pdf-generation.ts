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
): Promise<Uint8Array> {
    console.log('Starting PDF generation (Merged mode)...');
    let currentStep = '初期化';

    try {
        // 1. ファイルを読み込む
        currentStep = 'ファイル読み込み';
        console.log('Reading files as ArrayBuffer...');
        const frontArrayBuffer = await frontFile.arrayBuffer();
        const backArrayBuffer = await backFile.arrayBuffer();

        const frontUint8Array = new Uint8Array(frontArrayBuffer);
        const backUint8Array = new Uint8Array(backArrayBuffer);

        // 2. PDFをロード
        currentStep = 'PDF解析（表面）';
        const frontSrcDoc = await PDFDocument.load(frontUint8Array, { ignoreEncryption: true });

        currentStep = 'PDF解析（裏面）';
        const backSrcDoc = await PDFDocument.load(backUint8Array, { ignoreEncryption: true });

        // 3. 出力用PDFを作成 (1つのドキュメントに統合)
        currentStep = '出力用PDF作成';
        const outDoc = await PDFDocument.create();

        const totalCards = frontSrcDoc.getPageCount();
        const totalOutPages = Math.ceil(totalCards / CARDS_PER_PAGE);
        console.log(`Total cards: ${totalCards}, Total output sets (front+back): ${totalOutPages}`);

        // 裏面の1ページ目を取得
        currentStep = '裏面ページ埋め込み準備';
        const [backSrcPage] = await outDoc.embedPages([backSrcDoc.getPages()[0]]);

        // 4. ページ生成ループ
        currentStep = 'ページ生成ループ';
        for (let p = 0; p < totalOutPages; p++) {
            console.log(`Processing set ${p + 1}/${totalOutPages}...`);

            // 表面ページ作成
            const frontPage = outDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            drawGridLines(frontPage);

            // 裏面ページ作成（表面の直後に追加）
            const backPage = outDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
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
                        const [frontSrcPage] = await outDoc.embedPages([frontSrcDoc.getPages()[cardIndex]]);

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

                // 裏面カードの配置（すべての枠に配置）
                // ※共通デザインなので、表面と同じ位置（裏側）に配置すればOK
                currentStep = `裏面カード配置 (セット${p + 1}, 枠${i + 1})`;
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
        console.log('Saving merged PDF...');
        const pdfBytes = await outDoc.save();
        console.log('PDF saved successfully.');

        return pdfBytes;

    } catch (error) {
        console.error(`Error in step "${currentStep}":`, error);
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
