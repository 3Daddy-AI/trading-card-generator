import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Trading Card Generator",
    description: "A4横向きの標準トレカサイズ（63mm × 88mm）カード印刷ツール",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
