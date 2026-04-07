import type { EmbeddingProvider } from '@claude-memory/core'
import { type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'

interface OnnxEmbeddingConfig {
  modelName: string
}

const MODEL_DIMENSIONS: Record<string, number> = {
  'intfloat/multilingual-e5-small': 384,
  'intfloat/multilingual-e5-base': 768,
  'intfloat/multilingual-e5-large': 1024,
}

const DEFAULT_DIMENSION = 384

/** Embedding provider using ONNX Runtime for local inference with mean pooling and L2 normalization. */
export class OnnxEmbeddingProvider implements EmbeddingProvider {
  private readonly config: OnnxEmbeddingConfig
  private extractor: FeatureExtractionPipeline | null = null

  /**
   * Creates a new OnnxEmbeddingProvider instance.
   * @param config - Configuration specifying the ONNX model name
   */
  constructor(config: OnnxEmbeddingConfig) {
    this.config = config
  }

  /**
   * Returns the embedding dimension for the configured model.
   * @returns The number of dimensions in the output embedding vector
   */
  getDimension(): number {
    return MODEL_DIMENSIONS[this.config.modelName] ?? DEFAULT_DIMENSION
  }

  /**
   * Generates an embedding vector for a single text input.
   * @param text - The text to embed
   * @returns The normalized embedding vector
   */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor()
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  /**
   * Generates embedding vectors for multiple text inputs.
   * @param texts - Array of texts to embed
   * @returns Array of normalized embedding vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor()
    const results = await Promise.all(
      texts.map(async (text) => {
        const output = await extractor(text, { pooling: 'mean', normalize: true })
        return Array.from(output.data as Float32Array)
      }),
    )
    return results
  }

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.config.modelName)
    }
    return this.extractor
  }
}
