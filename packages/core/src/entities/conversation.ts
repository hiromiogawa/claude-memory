/** 順序付きメッセージを含む完全な会話セッション。 */
export interface ConversationLog {
  /** 会話セッションの一意な識別子。 */
  sessionId: string
  /** この会話が属するプロジェクトのファイルシステムパス。 */
  projectPath?: string
  /** 会話内のメッセージの順序付きリスト。 */
  messages: ConversationMessage[]
}

/** 会話内の1件のメッセージ。 */
export interface ConversationMessage {
  /** 送信者のロール。 */
  role: 'user' | 'assistant'
  /** メッセージのテキスト内容。 */
  content: string
  /** メッセージの送信日時。 */
  timestamp: Date
}
