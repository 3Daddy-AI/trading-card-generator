import { PDFDocument, rgb, PageSizes } from 'pdf-lib';

export async function generateCardPdfs(
    frontPdfBytes: ArrayBuffer,
    backPdfBytes: ArrayBuffer
): Promise<Uint8Array> {
    // Load source PDFs
    const frontSrcDoc = await PDFDocument.load(frontPdfBytes);
    const backSrcDoc = await PDFDocument.load(backPdfBytes);

    // Create new output PDF
    const outDoc = await PDFDocument.create();

    // Constants for A4 Landscape Layout with Standard Trading Card Size
    const PAGE_WIDTH = PageSizes.A4[1];  // 841.89pt = 297mm (landscape)
    const PAGE_HEIGHT = PageSizes.A4[0]; // 595.28pt = 210mm (landscape)

    // Standard trading card dimensions (63mm × 88mm)
    const CARD_WIDTH = 178.58;  // 63mm in points
    const CARD_HEIGHT = 249.45; // 88mm in points

    // Grid layout: 4 columns × 2 rows = 8 cards per page
    const COLS = 4;
    const ROWS = 2;
    const CARDS_PER_PAGE = COLS * ROWS;

    // Calculate total grid dimensions
    const TOTAL_GRID_WIDTH = CARD_WIDTH * COLS;
    const TOTAL_GRID_HEIGHT = CARD_HEIGHT * ROWS;

    // Center the grid on the page with equal margins
    const MARGIN_X = (PAGE_WIDTH - TOTAL_GRID_WIDTH) / 2;
    const MARGIN_Y = (PAGE_HEIGHT - TOTAL_GRID_HEIGHT) / 2;

    const CELL_WIDTH = CARD_WIDTH;
    const CELL_HEIGHT = CARD_HEIGHT;

    // Get total pages in front PDF
    const totalCards = frontSrcDoc.getPageCount();
    const totalOutPages = Math.ceil(totalCards / CARDS_PER_PAGE);

    // Prepare back page (we only use the first page of the back PDF)
    const [backPageSrc] = await outDoc.embedPages([backSrcDoc.getPages()[0]]);
    // Manual scaleToFit to card dimensions
    const backScale = Math.min(CARD_WIDTH / backPageSrc.width, CARD_HEIGHT / backPageSrc.height);
    const backPageDims = { width: backPageSrc.width * backScale, height: backPageSrc.height * backScale };

    // Iterate to create pages
    for (let p = 0; p < totalOutPages; p++) {
        const frontPage = outDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const backPage = outDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Draw grid lines (optional, for cutting) - let's draw light gray lines
        // Actually, user said "grid lines to cut along".
        // We can draw lines at cell boundaries.
        drawGridLines(frontPage, MARGIN_X, MARGIN_Y, TOTAL_GRID_WIDTH, TOTAL_GRID_HEIGHT, COLS, ROWS);
        drawGridLines(backPage, MARGIN_X, MARGIN_Y, TOTAL_GRID_WIDTH, TOTAL_GRID_HEIGHT, COLS, ROWS);

        for (let i = 0; i < CARDS_PER_PAGE; i++) {
            const cardIndex = p * CARDS_PER_PAGE + i;

            // Calculate grid position (row, col)
            // Order: Row 1 Left -> Row 1 Right -> Row 2 Left ...
            const row = Math.floor(i / COLS);
            const col = i % COLS;

            // Coordinates for Front Page
            // PDF coordinates start from Bottom-Left.
            // So Row 0 is at the Top.
            // y = PAGE_HEIGHT - MARGIN - (row + 1) * CELL_HEIGHT
            // x = MARGIN + col * CELL_WIDTH
            const xFront = MARGIN_X + col * CELL_WIDTH;
            const yFront = PAGE_HEIGHT - MARGIN_Y - (row + 1) * CELL_HEIGHT;

            // Coordinates for Back Page (Mirrored horizontally for Long Edge Binding)
            // Front (r, c) -> Back (r, 1-c)
            const colBack = (COLS - 1) - col;
            const xBack = MARGIN_X + colBack * CELL_WIDTH;
            const yBack = PAGE_HEIGHT - MARGIN_Y - (row + 1) * CELL_HEIGHT;

            if (cardIndex < totalCards) {
                // Embed and draw front card
                const [frontCardSrc] = await outDoc.embedPages([frontSrcDoc.getPages()[cardIndex]]);
                // Manual scaleToFit
                const frontScale = Math.min(CELL_WIDTH / frontCardSrc.width, CELL_HEIGHT / frontCardSrc.height);
                const dims = { width: frontCardSrc.width * frontScale, height: frontCardSrc.height * frontScale };

                // Center in cell
                const xOffset = (CELL_WIDTH - dims.width) / 2;
                const yOffset = (CELL_HEIGHT - dims.height) / 2;

                frontPage.drawPage(frontCardSrc, {
                    x: xFront + xOffset,
                    y: yFront + yOffset,
                    width: dims.width,
                    height: dims.height,
                });

                // Draw back card (replicate back)
                const backXOffset = (CELL_WIDTH - backPageDims.width) / 2;
                const backYOffset = (CELL_HEIGHT - backPageDims.height) / 2;

                backPage.drawPage(backPageSrc, {
                    x: xBack + backXOffset,
                    y: yBack + backYOffset,
                    width: backPageDims.width,
                    height: backPageDims.height,
                });
            } else {
                // Empty slot: fill with white rectangle or leave blank?
                // Let's fill with a white rectangle to make the grid visible
                frontPage.drawRectangle({
                    x: xFront,
                    y: yFront,
                    width: CELL_WIDTH,
                    height: CELL_HEIGHT,
                    color: rgb(1, 1, 1), // White
                });

                // Also blank on back?
                // Usually yes, if there is no front card, there should be no back card.
                backPage.drawRectangle({
                    x: xBack,
                    y: yBack,
                    width: CELL_WIDTH,
                    height: CELL_HEIGHT,
                    color: rgb(1, 1, 1),
                });
            }
        }
    }

    const pdfBytes = await outDoc.save();
    return pdfBytes;
}

function drawGridLines(page: any, marginX: number, marginY: number, width: number, height: number, cols: number, rows: number) {
    const cellW = width / cols;
    const cellH = height / rows;
    const pageH = page.getHeight();

    // Vertical lines
    for (let c = 0; c <= cols; c++) {
        const x = marginX + c * cellW;
        page.drawLine({
            start: { x, y: pageH - marginY },
            end: { x, y: pageH - marginY - height },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8), // Light gray
        });
    }

    // Horizontal lines
    for (let r = 0; r <= rows; r++) {
        const y = pageH - marginY - r * cellH;
        page.drawLine({
            start: { x: marginX, y },
            end: { x: marginX + width, y },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8),
        });
    }
}
