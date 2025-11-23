import { NextRequest, NextResponse } from 'next/server';
import { generateCardPdfs } from '../../utils/pdf-processing';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const frontFile = formData.get('front') as File;
        const backFile = formData.get('back') as File;

        if (!frontFile || !backFile) {
            return NextResponse.json(
                { error: 'Front and back files are required' },
                { status: 400 }
            );
        }

        const frontBuffer = await new Response(frontFile).arrayBuffer();
        const backBuffer = await new Response(backFile).arrayBuffer();

        const pdfBytes = await generateCardPdfs(frontBuffer, backBuffer);

        // Create response with PDF data
        const response = new NextResponse(pdfBytes as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="cards_print.pdf"',
            },
        });

        return response;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json(
            { error: `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
