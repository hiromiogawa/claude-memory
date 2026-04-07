/** Provider for generating embedding vectors from text. */
export interface EmbeddingProvider {
  /**
   * Generates an embedding vector for a single text.
   * @param text - The input text to embed.
   * @returns The embedding vector.
   */
  embed(text: string): Promise<number[]>
  /**
   * Generates embedding vectors for multiple texts in a single batch.
   * @param texts - The input texts to embed.
   * @returns An array of embedding vectors, one per input text.
   */
  embedBatch(texts: string[]): Promise<number[][]>
  /**
   * Returns the dimensionality of the embedding vectors produced by this provider.
   * @returns The number of dimensions.
   */
  getDimension(): number
}
