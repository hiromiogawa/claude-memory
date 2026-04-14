import { homedir } from 'node:os'
import { join } from 'node:path'
import type { EmbeddingProvider } from '@claude-memory/core'
import { env, type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers'
import { DEFAULT_DIMENSION } from './constants.js'

// transformers.js のモデルキャッシュ位置をユーザーホームの `~/.cache/huggingface/` に統一する。
// デフォルトはパッケージ自身のディレクトリ配下（pnpm の内部パス）で、host と Docker container
// では異なる node_modules パスになるためキャッシュが共有できない。HF_CACHE_DIR が設定されて
// いればそれを優先し、未設定時は OS 共通パターンの ~/.cache/huggingface/ を使う。
// host: /Users/<name>/.cache/huggingface (デフォルト)
// Docker container: /root/.cache/huggingface (HOME=/root)
// docker-compose.yml で host の ~/.cache/huggingface を container の /root/.cache/huggingface
// に bind mount すると、両者が物理的に同じディレクトリを共有しモデルの二重ダウンロードを回避できる。
env.cacheDir = process.env.HF_CACHE_DIR ?? join(homedir(), '.cache', 'huggingface')

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
