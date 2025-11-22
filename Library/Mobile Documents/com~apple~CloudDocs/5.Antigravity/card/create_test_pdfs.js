const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function createTestPdfs() {
    // Create Front PDF (9 pages)
    const frontDoc = await PDFDocument.create();
    const font = await frontDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < 9; i++) {
        const page = frontDoc.addPage([200, 300]); // Card size roughly
        page.drawText(`Front Card ${i + 1}`, {
            x: 50,
            y: 150,
            size: 20,
            font,
            color: rgb(0, 0, 0),
        });
        page.drawRectangle({
            x: 0, y: 0, width: 200, height: 300,
            borderColor: rgb(1, 0, 0), borderWidth: 2
        });
    }
    const frontBytes = await frontDoc.save();
    fs.writeFileSync('test-front.pdf', frontBytes);

    // Create Back PDF (1 page)
    const backDoc = await PDFDocument.create();
    const backPage = backDoc.addPage([200, 300]);
    backPage.drawText('Back Design', {
        x: 50,
        y: 150,
        size: 20,
        font,
        color: rgb(0, 0, 1),
    });
    backPage.drawRectangle({
        x: 0, y: 0, width: 200, height: 300,
        borderColor: rgb(0, 0, 1), borderWidth: 2
    });
    const backBytes = await backDoc.save();
    fs.writeFileSync('test-back.pdf', backBytes);

    console.log('Created test-front.pdf and test-back.pdf');
}

createTestPdfs();
