'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download } from 'lucide-react';
import './globals.css';

export default function Home() {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>('');

    const onDropFront = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setFrontFile(acceptedFiles[0]);
            setError('');
        }
    };

    const onDropBack = (acceptedFiles: File[]) => {
        if (acceptedFiles[0]) {
            setBackFile(acceptedFiles[0]);
            setError('');
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
            const formData = new FormData();
            formData.append('front', frontFile);
            formData.append('back', backFile);

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'PDF生成に失敗しました');
            }

            const blob = await response.blob();
            setGeneratedBlob(blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'PDF生成中にエラーが発生しました');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOpenNewTab = () => {
        if (generatedBlob) {
            const url = URL.createObjectURL(generatedBlob);
            window.open(url, '_blank');
        }
    };

    return (
        <main>
            <div className="container">
                <h1>Trading Card Generator</h1>
                <p className="subtitle">A4横向き面付け印刷（標準トレカサイズ: 63mm × 88mm）</p>

                <div className="upload-section">
                    <div className="upload-box" {...getFrontRootProps()}>
                        <input {...getFrontInputProps()} />
                        <p>表面PDF（複数ページ）</p>
                        {frontFile ? (
                            <p className="file-name">{frontFile.name}</p>
                        ) : (
                            <p className="upload-hint">クリックまたはドロップ</p>
                        )}
                    </div>

                    <div className="upload-box" {...getBackRootProps()}>
                        <input {...getBackInputProps()} />
                        <p>裏面PDF（1ページ）</p>
                        {backFile ? (
                            <p className="file-name">{backFile.name}</p>
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
                    {isGenerating ? '生成中...' : 'A4面付けPDFを生成'}
                </button>

                {generatedBlob && (
                    <div className="result">
                        <h2>生成完了！</h2>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                            ファイルサイズ: {(generatedBlob.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="result-actions">
                            <button
                                onClick={handleOpenNewTab}
                                className="download-button"
                            >
                                <Download size={20} />
                                PDFを開く
                            </button>
                        </div>
                    </div>
                )}

                <h2>使い方</h2>
                <ol>
                    <li>子どもたちが作ったカードのPDF (表面) をアップロードします。</li>
                    <li>共通の裏面デザインPDF (1ページ) をアップロードします。</li>
                    <li>「A4面付けPDFを生成」ボタンを押します。</li>
                    <li>「PDFを開く」ボタンで新しいタブでPDFを表示します</li>
                    <li>ブラウザの保存機能でPDFをダウンロードします</li>
                    <li>プリンタの設定で<strong>「A4横向き」「両面印刷」「長辺とじ」</strong>を選んで印刷してください。</li>
                    <li>印刷後、グリッド線に沿って切り取るとカードが完成します（標準トレカサイズ: 63mm × 88mm）。</li>
                    <li>市販のカードスリーブ（63mm × 88mm）がそのまま使えます。</li>
                </ol>
            </div>
        </main>
    );
}
