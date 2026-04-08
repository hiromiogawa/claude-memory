import type { EmbeddingProvider } from '@claude-memory/core'
import { type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'
import { DEFAULT_DIMENSION } from './constants.js'

interface OnnxEmbeddingConfig {
  modelName: string
}

const MODEL_DIMENSIONS: Record<string, number> = {
  'intfloat/multilingual-e5-small': 384,
  'intfloat/multilingual-e5-base': 768,
  'intfloat/multilingual-e5-large': 1024,
}

/** ONNX Runtimeによるローカル推論（mean pooling + L2正規化）を行うembeddingプロバイダ。 */
export class OnnxEmbeddingProvider implements EmbeddingProvider {
  private readonly config: OnnxEmbeddingConfig
  private extractor: FeatureExtractionPipeline | null = null

  /**
   * OnnxEmbeddingProviderの新しいインスタンスを生成する。
   * @param config - ONNXモデル名を指定する設定
   */
  constructor(config: OnnxEmbeddingConfig) {
    this.config = config
  }

  /**
   * 設定済みモデルのembedding次元数を返す。
   * @returns 出力embedding vectorの次元数
   */
  getDimension(): number {
    return MODEL_DIMENSIONS[this.config.modelName] ?? DEFAULT_DIMENSION
  }

  /**
   * 単一テキストのembedding vectorを生成する。
   * @param text - embeddingを生成するテキスト
   * @returns 正規化されたembedding vector
   */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor()
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  }

  /**
   * 複数テキストのembedding vectorをまとめて生成する。
   * @param texts - embeddingを生成するテキストの配列
   * @returns 正規化されたembedding vectorの配列
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
