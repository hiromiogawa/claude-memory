/** テキストからembedding vectorを生成するプロバイダー。 */
export interface EmbeddingProvider {
  /**
   * 単一テキストのembedding vectorを生成する。
   * @param text - embeddingする入力テキスト。
   * @returns embedding vector。
   */
  embed(text: string): Promise<number[]>
  /**
   * 複数テキストのembedding vectorを一括生成する。
   * @param texts - embeddingする入力テキストの配列。
   * @returns 入力テキストごとのembedding vectorの配列。
   */
  embedBatch(texts: string[]): Promise<number[][]>
  /**
   * このプロバイダーが生成するembedding vectorの次元数を返す。
   * @returns 次元数。
   */
  getDimension(): number
}
