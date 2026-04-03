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

export class OnnxEmbeddingProvider implements EmbeddingProvider {
  private readonly config: OnnxEmbeddingConfig
  private extractor: FeatureExtractionPipeline | null = null

  constructor(config: OnnxEmbeddingConfig) {
    this.config = config
  }

  getDimension(): number {
    return MODEL_DIMENSIONS[this.config.modelName] ?? DEFAULT_DIMENSION
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor()
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const extractor = await this.getExtractor()
    const results: number[][] = []
    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      results.push(Array.from(output.data as Float32Array))
    }
    return results
  }

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.config.modelName)
    }
    return this.extractor
  }
}
