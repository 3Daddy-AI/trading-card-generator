# Trading Card Generator

感情トレカ作成用アプリケーションです。
ブラウザ上でPDFの結合・面付け処理を行うため、高速かつ安全に利用できます。

## 🚀 デプロイURL (Deployment URL)

**https://trading-card-generator.vercel.app**

↑ここからいつでもアクセスできます。

## 機能

- **クライアントサイド処理:** サーバーにファイルをアップロードせず、ブラウザ内でPDFを生成します。
- **両面印刷対応:** 表面PDF（複数ページ）と裏面PDF（1ページ）をアップロードすると、自動的に交互に配置された「両面印刷用PDF」を生成します。
- **A4横向きレイアウト:** 標準トレカサイズ（63mm × 88mm）がA4横向き用紙に8枚（4列×2行）配置されます。

## 開発 (Development)

ローカルで実行する場合:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
