'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, FileText, Loader2 } from 'lucide-react';
import './globals.css';
import { generateTradingCardPdfs } from './utils/client-pdf-generation';
import { PDFDocument } from 'pdf-lib';

export default function Home() {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>('');

    // 生成されたPDFのBlob URL
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const onDropFront = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setFrontFile(acceptedFiles[0]);
            setError('');
            setPdfUrl(null);
        }
    };

    const onDropBack = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setBackFile(acceptedFiles[0]);
            setError('');
            setPdfUrl(null);
        }
    };

    const { getRootProps: getFrontRootProps, getInputProps: getFrontInputProps } = useDropzone({
        onDrop: onDropFront,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const { getRootProps: getBackRootProps, getInputProps: getBackInputProps } = useDropzone({
        onDrop: onDropBack,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    const handleGenerate = async () => {
        if (!frontFile || !backFile) {
            setError('表面PDFと裏面PDFの両方をアップロードしてください。');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            console.log('Generating PDF...');
            // クライアントサイドでPDF生成を実行 (統合された1つのPDFが返る)
            const mergedPdf = await generateTradingCardPdfs(frontFile, backFile);

            // Blobを作成してURLを生成
            const blob = new Blob([mergedPdf as any], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));

        } catch (err) {
            console.error('Generation Error:', err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`【エラー発生】${errorMessage}`);
            alert(`エラーが発生しました:\n${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // pdf-libの動作確認用
    const handleTest = async () => {
        try {
            const doc = await PDFDocument.create();
            const page = doc.addPage();
            page.drawText('Test PDF');
            const pdfBytes = await doc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            alert('テストPDF生成に成功しました');
        } catch (err) {
            alert('テストPDF生成に失敗: ' + String(err));
        }
    };

    return (
        <main>
            <div className="container">
                <h1>Trading Card Generator <span style={{ fontSize: '0.5em', color: 'red' }}>(v3.1)</span></h1>
                <p className="subtitle">
                    A4横向き面付け印刷（標準トレカサイズ: 63mm × 88mm）<br />
                    <span style={{ fontSize: '0.9em', color: '#888' }}>
                        ※ブラウザ内で処理するため、高速で安全です。サーバーへのアップロードは行われません。
                    </span>
                </p>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <button onClick={handleTest} style={{ padding: '5px 10px', fontSize: '12px', background: '#eee', border: '1px solid #ccc' }}>
                        動作テスト（クリックしてPDF生成テスト）
                    </button>
                </div>

                <div className="upload-section">
                    <div className="upload-box" {...getFrontRootProps()}>
                        <input {...getFrontInputProps()} />
                        <p>表面PDF（複数ページ）</p>
                        {frontFile ? (
                            <div className="file-info">
                                <FileText size={24} />
                                <p className="file-name">{frontFile.name}</p>
                            </div>
                        ) : (
                            <p className="upload-hint">クリックまたはドロップ</p>
                        )}
                    </div>

                    <div className="upload-box" {...getBackRootProps()}>
                        <input {...getBackInputProps()} />
                        <p>裏面PDF（1ページ）</p>
                        {backFile ? (
                            <div className="file-info">
                                <FileText size={24} />
                                <p className="file-name">{backFile.name}</p>
                            </div>
                        ) : (
                            <p className="upload-hint">クリックまたはドロップ</p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="error" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={!frontFile || !backFile || isGenerating}
                    className="generate-button"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px', display: 'inline' }} />
                            生成中...
                        </>
                    ) : (
                        'A4面付けPDFを生成（両面用）'
                    )}
                </button>

                {pdfUrl && (
                    <div className="result">
                        <h2>生成完了！</h2>
                        <p style={{ marginBottom: '1.5rem', color: '#555' }}>
                            以下のボタンからPDFをダウンロードしてください。<br />
                            （表ページと裏ページが交互に配置されています）
                        </p>

                        <div className="result-actions" style={{ justifyContent: 'center' }}>
                            <a
                                href={pdfUrl}
                                download="toreca-merged.pdf"
                                className="download-button"
                                style={{
                                    textDecoration: 'none',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem'
                                }}
                            >
                                <Download size={24} style={{ marginRight: '10px' }} />
                                両面印刷用PDFをダウンロード
                            </a>
                        </div>
                    </div>
                )}

                <div className="instructions">
                    <h2>使い方</h2>
                    <ol>
                        <li>子どもたちが作ったカードのPDF (表面) をアップロードします。</li>
                        <li>共通の裏面デザインPDF (1ページ) をアップロードします。</li>
                        <li>「A4面付けPDFを生成」ボタンを押します。</li>
                        <li>生成されたPDFをダウンロードします。</li>
                        <li>プリンタの設定で<strong>「A4横向き」「両面印刷（長辺とじ）」</strong>を選んで印刷してください。</li>
                        <li>印刷後、グリッド線に沿って切り取るとカードが完成します（標準トレカサイズ: 63mm × 88mm）。</li>
                    </ol>
                </div>
            </div>
        </main>
    );
}
