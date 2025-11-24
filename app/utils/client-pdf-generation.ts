import { PDFDocument, rgb, PageSizes } from 'pdf-lib';

// 標準トレカサイズ (63mm x 88mm)
const CARD_WIDTH_MM = 63;
const CARD_HEIGHT_MM = 88;

// A4サイズ (横向き)
// pdf-libのPageSizes.A4は [595.28, 841.89] (ポイント単位)
// 1mm = 2.83465pt
const MM_TO_PT = 2.83465;
const PAGE_WIDTH = PageSizes.A4[1]; // 841.89pt (297mm)
const PAGE_HEIGHT = PageSizes.A4[0]; // 595.28pt (210mm)

const CARD_WIDTH_PT = CARD_WIDTH_MM * MM_TO_PT;
const CARD_HEIGHT_PT = CARD_HEIGHT_MM * MM_TO_PT;

// グリッド設定 (A4横向き: 4列 x 2行 = 8枚)
const COLS = 4;
const ROWS = 2;
const CARDS_PER_PAGE = COLS * ROWS;

// グリッド全体のサイズ
const TOTAL_GRID_WIDTH = CARD_WIDTH_PT * COLS;
const TOTAL_GRID_HEIGHT = CARD_HEIGHT_PT * ROWS;

// 余白（中央寄せ）
const MARGIN_X = (PAGE_WIDTH - TOTAL_GRID_WIDTH) / 2;
const MARGIN_Y = (PAGE_HEIGHT - TOTAL_GRID_HEIGHT) / 2;

export async function generateTradingCardPdfs(
    frontFile: File,
    backFile: File
): Promise<{ frontPdf: Uint8Array; backPdf: Uint8Array }> {
    // 1. ファイルを読み込む
    const frontArrayBuffer = await frontFile.arrayBuffer();
    const backArrayBuffer = await backFile.arrayBuffer();

    const frontSrcDoc = await PDFDocument.load(frontArrayBuffer);
    const backSrcDoc = await PDFDocument.load(backArrayBuffer);

    // 2. 出力用PDFを作成
    const frontOutDoc = await PDFDocument.create();
    const backOutDoc = await PDFDocument.create();

    // 表面の総ページ数（カード枚数）
    const totalCards = frontSrcDoc.getPageCount();
    const totalOutPages = Math.ceil(totalCards / CARDS_PER_PAGE);

    // 裏面の1ページ目を取得（共通デザイン）
    const [backSrcPage] = await backOutDoc.embedPages([backSrcDoc.getPages()[0]]);

    // 3. ページ生成ループ
    for (let p = 0; p < totalOutPages; p++) {
        // 新しいページを追加 (A4横)
        const frontPage = frontOutDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const backPage = backOutDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // グリッド線を描画
        drawGridLines(frontPage);
        drawGridLines(backPage);

        // 8枚分のカードを配置
        for (let i = 0; i < CARDS_PER_PAGE; i++) {
            const cardIndex = p * CARDS_PER_PAGE + i;

            // グリッド位置 (行, 列)
            const row = Math.floor(i / COLS);
            const col = i % COLS;

            // 座標計算 (左下が原点)
            // 上から順に配置するため、Y座標は上から計算
            const x = MARGIN_X + col * CARD_WIDTH_PT;
            const y = PAGE_HEIGHT - MARGIN_Y - (row + 1) * CARD_HEIGHT_PT;

            // 表面カードの配置
            if (cardIndex < totalCards) {
                const [frontSrcPage] = await frontOutDoc.embedPages([frontSrcDoc.getPages()[cardIndex]]);

                // サイズに合わせてスケーリング
                const scale = Math.min(
                    CARD_WIDTH_PT / frontSrcPage.width,
                    CARD_HEIGHT_PT / frontSrcPage.height
                );

                // 中央寄せオフセット
                const xOffset = (CARD_WIDTH_PT - frontSrcPage.width * scale) / 2;
                const yOffset = (CARD_HEIGHT_PT - frontSrcPage.height * scale) / 2;

                frontPage.drawPage(frontSrcPage, {
                    x: x + xOffset,
                    y: y + yOffset,
                    width: frontSrcPage.width * scale,
                    height: frontSrcPage.height * scale,
                });
            }

            // 裏面カードの配置（すべての枠に配置）
            // ※「表面と同じグリッド位置」という仕様に従い、ミラーリングは行わない
            // （別ファイル出力なので、貼り合わせや両面印刷設定はユーザー次第）

            // 裏面のスケーリング
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

    // 4. PDFをバイト配列として出力
    const frontPdfBytes = await frontOutDoc.save();
    const backPdfBytes = await backOutDoc.save();

    return {
        frontPdf: frontPdfBytes,
        backPdf: backPdfBytes,
    };
}

// グリッド線を描画するヘルパー関数
function drawGridLines(page: any) {
    const pageHeight = page.getHeight();

    // 枠線を描画
    for (let r = 0; r <= ROWS; r++) {
        const y = PAGE_HEIGHT - MARGIN_Y - r * CARD_HEIGHT_PT;
        page.drawLine({
            start: { x: MARGIN_X, y },
            end: { x: MARGIN_X + TOTAL_GRID_WIDTH, y },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8), // 薄いグレー
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
