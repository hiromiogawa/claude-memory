# @claude-memory/embedding-onnx

ONNX埋め込み実装。@huggingface/transformersでローカル推論。

## OnnxEmbeddingProvider

### 設定
| オプション | デフォルト | 説明 |
|-----------|----------|------|
| modelName | intfloat/multilingual-e5-small | 埋め込みモデル |

### 利用可能モデル
| モデル | 次元 | サイズ |
|--------|------|--------|
| intfloat/multilingual-e5-small | 384 | ~100MB |
| intfloat/multilingual-e5-base | 768 | ~300MB |
| intfloat/multilingual-e5-large | 1024 | ~500MB |

### 実装詳細
- 遅延初期化: 初回embed時にモデルをダウンロード → `~/.cache/` にキャッシュ
- プーリング: mean pooling
- 正規化: L2 norm
- バッチ処理: `Promise.all` で並列実行
- Dockerイメージビルド時にwarmupでモデルをプリダウンロード
