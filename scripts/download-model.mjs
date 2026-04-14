// Run this from packages/embedding-onnx/ directory
// so pnpm's node_modules resolution works correctly
import { defineOnnxEmbeddingProvider } from '../packages/embedding-onnx/dist/onnx-embedding-provider.js'

const modelName = process.env.EMBEDDING_MODEL || 'intfloat/multilingual-e5-small'
console.log(`Downloading model: ${modelName}...`)

const provider = defineOnnxEmbeddingProvider({ modelName })
const result = await provider.embed('warmup test')
console.log(`Model cached. Dimension: ${result.length}`)
