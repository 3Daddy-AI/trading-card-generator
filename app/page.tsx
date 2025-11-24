'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, FileText, Loader2 } from 'lucide-react';
import './globals.css';
import { generateTradingCardPdfs } from './utils/client-pdf-generation';

export default function Home() {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>('');

    // 生成されたPDFのBlob URL
    const [frontPdfUrl, setFrontPdfUrl] = useState<string | null>(null);
    const [backPdfUrl, setBackPdfUrl] = useState<string | null>(null);

    const onDropFront = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setFrontFile(acceptedFiles[0]);
            setError('');
            // 新しいファイルが選ばれたら以前の結果をリセット
            setFrontPdfUrl(null);
            setBackPdfUrl(null);
        }
    };

    const onDropBack = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setBackFile(acceptedFiles[0]);
            setError('');
            setFrontPdfUrl(null);
            setBackPdfUrl(null);
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
            // クライアントサイドでPDF生成を実行
            const { frontPdf, backPdf } = await generateTradingCardPdfs(frontFile, backFile);

            // Blobを作成してURLを生成
            const frontBlob = new Blob([frontPdf], { type: 'application/pdf' });
            const backBlob = new Blob([backPdf], { type: 'application/pdf' });

            setFrontPdfUrl(URL.createObjectURL(frontBlob));
            setBackPdfUrl(URL.createObjectURL(backBlob));

        } catch (err) {
            console.error(err);
            setError('PDF生成中にエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main>
            <div className="container">
                <h1>Trading Card Generator</h1>
                <p className="subtitle">
                    A4横向き面付け印刷（標準トレカサイズ: 63mm × 88mm）<br />
                    <span style={{ fontSize: '0.9em', color: '#888' }}>
                        ※ブラウザ内で処理するため、高速で安全です。サーバーへのアップロードは行われません。
                    </span>
                </p>

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

                {error && <div className="error">{error}</div>}

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
                        'A4面付けPDFを生成'
                    )}
                </button>

                {frontPdfUrl && backPdfUrl && (
                    <div className="result">
                        <h2>生成完了！</h2>
                        <p style={{ marginBottom: '1.5rem', color: '#555' }}>
                            以下のボタンからそれぞれのPDFをダウンロードしてください。
                        </p>

                        <div className="result-actions">
                            <a
                                href={frontPdfUrl}
                                download="toreca-front.pdf"
                                className="download-button front-download"
                                style={{ textDecoration: 'none' }}
                            >
                                <Download size={20} />
                                表面PDFをダウンロード
                            </a>

                            <a
                                href={backPdfUrl}
                                download="toreca-back.pdf"
                                className="download-button back-download"
                                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%)' }}
                            >
                                <Download size={20} />
                                裏面PDFをダウンロード
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
                        <li>生成された「表面PDF」と「裏面PDF」をそれぞれダウンロードします。</li>
                        <li>プリンタの設定で<strong>「A4横向き」</strong>を選んで印刷してください。</li>
                        <li>両面印刷する場合は、プリンタの仕様に合わせて用紙をセットするか、手差しで裏面を印刷してください。</li>
                        <li>印刷後、グリッド線に沿って切り取るとカードが完成します（標準トレカサイズ: 63mm × 88mm）。</li>
                    </ol>
                </div>
            </div>
        </main>
    );
}
