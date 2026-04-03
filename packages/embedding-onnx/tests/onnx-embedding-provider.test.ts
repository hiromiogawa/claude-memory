import { beforeAll, describe, expect, it } from 'vitest'
import { OnnxEmbeddingProvider } from '../src/onnx-embedding-provider.js'

describe('OnnxEmbeddingProvider', () => {
  let provider: OnnxEmbeddingProvider

  beforeAll(async () => {
    provider = new OnnxEmbeddingProvider({
      modelName: 'intfloat/multilingual-e5-small',
    })
  })

  describe('getDimension', () => {
    it('should return 384 for multilingual-e5-small', () => {
      expect(provider.getDimension()).toBe(384)
    })
  })

  describe('embed', () => {
    it('should return a vector of correct dimension', async () => {
      const vector = await provider.embed('テスト文章')
      expect(vector).toHaveLength(384)
      expect(vector.every((v) => typeof v === 'number')).toBe(true)
    })

    it('should return different vectors for different texts', async () => {
      const vec1 = await provider.embed('TypeScriptの型推論')
      const vec2 = await provider.embed('今日の天気は晴れ')
      expect(vec1).not.toEqual(vec2)
    })

    it('should return similar vectors for similar texts', async () => {
      const vec1 = await provider.embed('TypeScriptの型推論について')
      const vec2 = await provider.embed('TypeScriptの型システム')
      const similarity = cosineSimilarity(vec1, vec2)
      expect(similarity).toBeGreaterThan(0.5)
    })
  })

  describe('embedBatch', () => {
    it('should embed multiple texts at once', async () => {
      const vectors = await provider.embedBatch(['テスト1', 'テスト2', 'テスト3'])
      expect(vectors).toHaveLength(3)
      expect(vectors.every((v) => v.length === 384)).toBe(true)
    })
  })
})

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
