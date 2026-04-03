export interface ConversationLog {
  sessionId: string
  projectPath?: string
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
