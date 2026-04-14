import type { EmbeddingProvider } from '@claude-memory/core'
import { pipeline } from '@huggingface/transformers'
import { DEFAULT_DIMENSION } from './constants.js'

export interface OnnxEmbeddingConfig {
  modelName: string
}

const MODEL_DIMENSIONS: Record<string, number> = {
  'intfloat/multilingual-e5-small': 384,
  'intfloat/multilingual-e5-base': 768,
  'intfloat/multilingual-e5-large': 1024,
}

/**
 * ONNX Runtime によるローカル推論（mean pooling + L2 正規化）で
 * EmbeddingProvider を実装するユースケースを生成する。
 *
 * モデルロードは factory 呼び出し時点で開始される（eager）。返された Promise は
 * 初回 embed 時に await されるため、複数の呼び出しは同じロード処理を共有する。
 * @param config - ONNX モデル名を指定する設定
 */
export function defineOnnxEmbeddingProvider(config: OnnxEmbeddingConfig): EmbeddingProvider {
  const extractorPromise = pipeline('feature-extraction', config.modelName)
  const dimension = MODEL_DIMENSIONS[config.modelName] ?? DEFAULT_DIMENSION

  return {
    getDimension: (): number => dimension,

    async embed(text: string): Promise<number[]> {
      const extractor = await extractorPromise
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const extractor = await extractorPromise
      const output = await extractor(texts, { pooling: 'mean', normalize: true })
      const flat = output.data as Float32Array
      return texts.map((_, i) => Array.from(flat.slice(i * dimension, (i + 1) * dimension)))
    },
  }
}
