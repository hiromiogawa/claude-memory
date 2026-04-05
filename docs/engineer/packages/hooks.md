# @claude-memory/hooks

Claude Code Hooks連携。PostSessionEndフックでセッション終了時に会話を自動保存。

## SessionEndHandler
会話ログ（JSONL）を読み取り、Q&Aペアに分割してDBに保存する。

### 処理フロー
1. JSOLNファイルを1行ずつパース
2. 不正な行はスキップ（graceful degradation）
3. QAChunkingStrategyでQ&Aペアに分割
4. SaveMemoryUseCase.saveConversation()で保存

## QAChunkingStrategy
会話をQ&Aペアに分割するチャンキング戦略。

### 設定
| オプション | デフォルト | 説明 |
|-----------|----------|------|
| maxChunkChars | 1000 | チャンクの最大文字数 |

### 分割ロジック
1. 連続するuserメッセージ → Q部分
2. 連続するassistantメッセージ → A部分
3. `Q: {question}\nA: {answer}` 形式で結合
4. maxChunkCharsを超えた場合は文境界で分割（日本語`。`、英語`.!?`）
5. 単一文が上限を超える場合は文字数で強制分割
