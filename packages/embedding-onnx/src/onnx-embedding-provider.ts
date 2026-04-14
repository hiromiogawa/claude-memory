import type { EmbeddingProvider } from '@claude-memory/core'
import { type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'
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
 * モデルは遅延初期化: 初回 embed 呼び出し時にロードが開始され、後続の呼び出しは
 * 同じ Promise を共有する。factory 呼び出し時点では `pipeline()` を起動しない
 * ことで unhandled rejection（呼び出し側が await する前に reject する可能性）を回避する。
 * @param config - ONNX モデル名を指定する設定
 */
export function defineOnnxEmbeddingProvider(config: OnnxEmbeddingConfig): EmbeddingProvider {
  const dimension = MODEL_DIMENSIONS[config.modelName] ?? DEFAULT_DIMENSION
  const cache: { extractor: Promise<FeatureExtractionPipeline> | null } = { extractor: null }

  const getExtractor = (): Promise<FeatureExtractionPipeline> =>
    (cache.extractor ??= pipeline('feature-extraction', config.modelName))

  return {
    getDimension: (): number => dimension,

    async embed(text: string): Promise<number[]> {
      const extractor = await getExtractor()
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const extractor = await getExtractor()
      const output = await extractor(texts, { pooling: 'mean', normalize: true })
      const flat = output.data as Float32Array
      return texts.map((_, i) => Array.from(flat.slice(i * dimension, (i + 1) * dimension)))
    },
  }
}
