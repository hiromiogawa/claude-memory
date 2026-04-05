# 技術選定

各技術の選定理由と検討した代替案。

## 埋め込みモデル: ONNX (multilingual-e5-small)

**選定理由:**
- ローカル実行可能（外部API不要 → プライバシー保護）
- 多言語対応（日本語・英語のコード混在に強い）
- 384次元でコンパクト（検索速度とストレージ効率のバランス）
- @huggingface/transformers でNode.jsネイティブ実行

**代替案:**
| 案 | 不採用理由 |
|----|-----------|
| OpenAI Embedding API | 外部送信が必要。プライバシー・コスト・レイテンシの問題 |
| Sentence Transformers (Python) | Node.jsプロジェクトにPythonランタイムの追加依存 |
| multilingual-e5-large | 1024次元で精度は高いが、サイズ (~500MB) とメモリ使用量が大きい |

## DB: PostgreSQL 16 + pgvector + pg_bigm

**選定理由:**
- pgvector: HNSWインデックスで高速なベクトル近傍検索
- pg_bigm: 日本語テキストのbigram全文検索（MeCab等の形態素解析不要）
- 1つのDBでキーワード検索・ベクトル検索・メタデータ管理を統合
- 成熟したエコシステム、運用実績

**代替案:**
| 案 | 不採用理由 |
|----|-----------|
| SQLite + sqlite-vec | 軽量だがpg_bigm相当の日本語検索がない |
| Qdrant / Pinecone | ベクトル検索専用でキーワード検索やメタデータ管理が別途必要 |
| Elasticsearch | 過剰な複雑さ。このユースケースにはオーバースペック |

## ORM: Drizzle ORM

**選定理由:**
- TypeScript-firstで型安全なクエリ構築
- SQL-likeなAPIで学習コストが低い
- pgvector/pg_bigmの生SQLとの混在が容易（`sql` テンプレートリテラル）
- 軽量（Prismaと比べてバンドルサイズが小さい）

**代替案:**
| 案 | 不採用理由 |
|----|-----------|
| Prisma | pgvectorの型サポートが弱い。生SQLが書きにくい |
| Kysely | 型安全だがDrizzleと比べてエコシステムが小さい |
| 生SQL (postgres パッケージ) | 型安全性がない。マイグレーション管理が手動 |

## MCP: @modelcontextprotocol/sdk

**選定理由:**
- Claude Code公式のツール連携プロトコル
- stdio transport でシンプル（HTTPサーバー不要）
- Zodスキーマで引数バリデーション
- Claude Codeのsettings.jsonから直接起動可能

## コンテナ: Docker Compose

**選定理由:**
- PostgreSQL（カスタムイメージ: pgvector + pg_bigm）とMCPサーバーを1コマンドで起動
- ONNXモデルをイメージ内にキャッシュ（初回起動の待ち時間削減）
- ホストマシンへの依存を最小化（Node.js, PostgreSQLのインストール不要）
- `docker exec` でClaude Codeから直接アクセス

## Gitフック: husky + lint-staged

**選定理由:**
- Node.jsプロジェクトの事実上の標準
- lint-stagedでステージファイルのみに対してlint/formatを実行（高速）
- biomeの自動修正結果を自動で再ステージ

**以前の選択:**
- lefthook（Go製） → husky + lint-stagedに移行。Node.jsエコシステムとの自然さを優先

## 品質ツール

| ツール | 役割 | 選定理由 |
|--------|------|---------|
| OXLint | 高速lint | ESLintより10-100倍高速。jsdocプラグイン対応 |
| Biome | フォーマット + lint | Prettier互換だが高速。ESLintの一部ルールも内蔵 |
| knip | 未使用コード検出 | モノレポ対応。使われていないexport/依存を検出 |
| dependency-cruiser | 依存方向検証 | パッケージ間の不正な依存を自動検出 |
| commitlint | コミットメッセージ検証 | Conventional Commits準拠を強制 |

## テストフレームワーク: Vitest

**選定理由:**
- Viteベースで高速な起動・実行
- ESM対応（このプロジェクトは全パッケージESM）
- Jest互換API（移行コストが低い）
- `--passWithNoTests` でテストファイルがないパッケージもCI通過
