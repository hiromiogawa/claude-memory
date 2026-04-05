# ADR-0003: アーキテクチャ図をdrawioからFigJamに移行

## ステータス

採用

## コンテキスト

アーキテクチャ図を `docs/architecture.drawio` で管理し、CIでPNGエクスポートしていたが、以下の問題があった。

## 決定

**FigJam（Figma MCP経由）** でダイアグラムを作成し、PNGエクスポートしてリポジトリにコミットする。

## 理由

- drawioのXMLは人間が直接編集するのが困難
- CIのdrawioエクスポートが正常に動作していなかった（`continue-on-error: true` で無視されていた）
- Figma MCPでMermaid.js構文から図を生成できる
- FigJamのGUIで細かい調整が可能
- PNGをコミットすることでGitHub上で直接プレビューできる

## 影響

- `docs/architecture.drawio` を削除
- CIの `docs` ジョブを削除
- 図の更新はFigJamで行い、PNGを手動でエクスポート・コミット
- 図の元データはFigJamファイルとして管理（リポジトリ外）
