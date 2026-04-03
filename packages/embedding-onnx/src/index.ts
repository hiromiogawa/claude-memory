// Import types for dependency validation
import type { EmbeddingProvider } from '@claude-memory/core'
import type { env } from '@huggingface/transformers'

// Type-only exports to satisfy dependency requirements
export type { EmbeddingProvider }

// Placeholder type for future implementation
export interface OnnxEmbeddingProvider extends EmbeddingProvider {
  // TODO: Implement ONNX-based embedding provider
}
