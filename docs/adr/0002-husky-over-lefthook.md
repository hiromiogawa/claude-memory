# ADR-0002: lefthookからhusky + lint-stagedへの移行

## ステータス

採用

## コンテキスト

Gitフック管理にlefthook（Go製）を使用していたが、以下の理由で見直しを行った。

## 決定

**husky + lint-staged** に移行。

## 理由

- Node.jsプロジェクトではhusky + lint-stagedが事実上の標準
- エコシステム・ドキュメントが圧倒的に豊富
- Go製バイナリへの追加依存が不要になる
- lint-stagedのステージファイル限定実行と自動再ステージが標準動作
- lefthookの `parallel: true` は lint-staged で代替可能

## 影響

- `lefthook.yml` を削除、`.husky/` ディレクトリを追加
- `pnpm prepare` で husky をセットアップ
- `.husky/` のファイルに実行権限（`chmod +x`）が必要
