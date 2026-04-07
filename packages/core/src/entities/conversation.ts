/** A complete conversation session containing ordered messages. */
export interface ConversationLog {
  /** Unique identifier for the conversation session. */
  sessionId: string
  /** Filesystem path of the project this conversation belongs to. */
  projectPath?: string
  /** Ordered list of messages in the conversation. */
  messages: ConversationMessage[]
}

/** A single message within a conversation. */
export interface ConversationMessage {
  /** The sender role. */
  role: 'user' | 'assistant'
  /** The text content of the message. */
  content: string
  /** When the message was sent. */
  timestamp: Date
}
