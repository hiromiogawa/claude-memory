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
 * モデルは遅延初期化: 初回 embed 呼び出し時にダウンロードし `~/.cache/` にキャッシュする。
 * @param config - ONNX モデル名を指定する設定
 */
export function defineOnnxEmbeddingProvider(config: OnnxEmbeddingConfig): EmbeddingProvider {
  let extractor: FeatureExtractionPipeline | null = null

  const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
    if (!extractor) {
      extractor = await pipeline('feature-extraction', config.modelName)
    }
    return extractor
  }

  const getDimension = (): number => MODEL_DIMENSIONS[config.modelName] ?? DEFAULT_DIMENSION

  return {
    getDimension,

    async embed(text: string): Promise<number[]> {
      const ex = await getExtractor()
      const output = await ex(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data as Float32Array)
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const ex = await getExtractor()
      const output = await ex(texts, { pooling: 'mean', normalize: true })
      const dim = getDimension()
      const flat = output.data as Float32Array
      const results: number[][] = []
      for (let i = 0; i < texts.length; i++) {
        results.push(Array.from(flat.slice(i * dim, (i + 1) * dim)))
      }
      return results
    },
  }
}
