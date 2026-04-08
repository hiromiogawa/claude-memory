# Changelog

## 1.0.0 (2026-04-08)


### Features

* add Docker production setup (Dockerfile + docker-compose.yml) ([5674bec](https://github.com/hiromiogawa/claude-memory/commit/5674bec3441984daae7749e7523a250de8b55a21))
* **ci:** add Issue templates, PR template, CI workflows, and Renovate config ([ba75511](https://github.com/hiromiogawa/claude-memory/commit/ba75511b88fb1bb3100f3ff2caf3e143b0fdc023))
* **ci:** add Terraform GitHub infrastructure (labels, branch protection) ([4aefc69](https://github.com/hiromiogawa/claude-memory/commit/4aefc6979a381f9f685b749e4d7ba7a7728d4536))
* **ci:** add test coverage thresholds to all packages ([#88](https://github.com/hiromiogawa/claude-memory/issues/88)) ([2e973d8](https://github.com/hiromiogawa/claude-memory/commit/2e973d8c67e679f094b4890ced5ecbb02451961b)), closes [#74](https://github.com/hiromiogawa/claude-memory/issues/74)
* **core:** add access frequency tracking to search scoring ([#119](https://github.com/hiromiogawa/claude-memory/issues/119)) ([2904149](https://github.com/hiromiogawa/claude-memory/commit/2904149513da001f5be0337f9265a44efa9a3dbf))
* **core:** add custom error hierarchy ([fbd514a](https://github.com/hiromiogawa/claude-memory/commit/fbd514a135ab1e1cdd9708704e8c8d7e407b17af))
* **core:** add DeleteMemory, ListMemories, GetStats, ClearMemory use cases ([eff775a](https://github.com/hiromiogawa/claude-memory/commit/eff775a409c36f6fa4d94c117c2a2dcae50c8e84))
* **core:** add domain entities and search defaults ([a87a790](https://github.com/hiromiogawa/claude-memory/commit/a87a790bc785468bc77c52c01e4ae1aa53dc44f3))
* **core:** add memory prune and capacity management ([#123](https://github.com/hiromiogawa/claude-memory/issues/123)) ([3d76218](https://github.com/hiromiogawa/claude-memory/commit/3d76218972368aa60eb09ac4341579b8b382d50a))
* **core:** add monitoring metrics and latency tracking ([#31](https://github.com/hiromiogawa/claude-memory/issues/31)) ([eda696a](https://github.com/hiromiogawa/claude-memory/commit/eda696a1eb89946751677734be39efb78c609dbd)), closes [#14](https://github.com/hiromiogawa/claude-memory/issues/14)
* **core:** add port interfaces (EmbeddingProvider, StorageRepository, ChunkingStrategy) ([0307f36](https://github.com/hiromiogawa/claude-memory/commit/0307f36f8f09f157ea3e7b223c76f5496e4df048))
* **core:** add SaveMemoryUseCase with manual and conversation save ([28648c6](https://github.com/hiromiogawa/claude-memory/commit/28648c6afa720e4c66c6b652ed99d5c8f5e93286))
* **core:** add SearchMemoryUseCase with RRF fusion and time decay ([7be3787](https://github.com/hiromiogawa/claude-memory/commit/7be3787715c91ad4d2447e066d0f04abad7c5c0b))
* **core:** finalize public API exports and verify build ([26afb6b](https://github.com/hiromiogawa/claude-memory/commit/26afb6bc6a4bb20937ad03322422ea2e714c7913))
* **core:** memory_updateツールの追加 ([#22](https://github.com/hiromiogawa/claude-memory/issues/22)) ([fb6610a](https://github.com/hiromiogawa/claude-memory/commit/fb6610a20b474894d9d43866b5c77191efd0badb))
* **core:** バックアップ・エクスポート機能 ([#30](https://github.com/hiromiogawa/claude-memory/issues/30)) ([cfc643b](https://github.com/hiromiogawa/claude-memory/commit/cfc643b501b481cdc5bf2bf681573420fdce480d))
* **core:** プロジェクト横断の記憶共有ルール（scope: project/global） ([#91](https://github.com/hiromiogawa/claude-memory/issues/91)) ([6cee305](https://github.com/hiromiogawa/claude-memory/commit/6cee305873794d6271b0788ccf9b96414bafad97))
* **core:** 古い記憶の自動クリーンアップ ([#32](https://github.com/hiromiogawa/claude-memory/issues/32)) ([d587250](https://github.com/hiromiogawa/claude-memory/commit/d58725038db5e10c5a715b3456ec0b5dd601ca9a))
* **core:** 類似度ベースの重複検出・排除 ([#18](https://github.com/hiromiogawa/claude-memory/issues/18)) ([3cd88ec](https://github.com/hiromiogawa/claude-memory/commit/3cd88ececea7bad15086aa08c2ba1f3637cf41df))
* **embedding-onnx:** implement OnnxEmbeddingProvider with @huggingface/transformers ([ac30d1b](https://github.com/hiromiogawa/claude-memory/commit/ac30d1b07a3fd9cd3856150c7c579b20530b0e6a))
* **hooks:** add importance filtering to QA chunking ([#92](https://github.com/hiromiogawa/claude-memory/issues/92)) ([8cd4978](https://github.com/hiromiogawa/claude-memory/commit/8cd4978a85bef1208e0f64356d12d942908b8c1f)), closes [#48](https://github.com/hiromiogawa/claude-memory/issues/48)
* **hooks:** add package exports ([d84f940](https://github.com/hiromiogawa/claude-memory/commit/d84f94067e1c89f1a1042a1cfcc5f0ca37ab4172))
* **hooks:** add SessionStart hook for automatic memory recall ([#90](https://github.com/hiromiogawa/claude-memory/issues/90)) ([9ff6fa6](https://github.com/hiromiogawa/claude-memory/commit/9ff6fa68c42f8d65de4673c8b4d91a7173896c3b)), closes [#49](https://github.com/hiromiogawa/claude-memory/issues/49)
* **hooks:** implement QAChunkingStrategy ([2c5cc45](https://github.com/hiromiogawa/claude-memory/commit/2c5cc457e8f398145b9beca366832f831944615c))
* **hooks:** implement SessionEndHandler with JSONL parsing ([7798979](https://github.com/hiromiogawa/claude-memory/commit/779897944cef19e517ddd4e5254d7fe7b00213ef))
* **hooks:** Q&Aチャンクサイズ制限の追加 ([#17](https://github.com/hiromiogawa/claude-memory/issues/17)) ([d8ce99c](https://github.com/hiromiogawa/claude-memory/commit/d8ce99cf645b5a2bb51eb8b73840fc090212935b))
* **mcp-server:** add allProjects flag to memory_search ([#23](https://github.com/hiromiogawa/claude-memory/issues/23)) ([70d4133](https://github.com/hiromiogawa/claude-memory/commit/70d41331ef9c148eeeca5feda5572ffedf7f5bd6)), closes [#9](https://github.com/hiromiogawa/claude-memory/issues/9)
* **mcp-server:** add config and DI container ([de04621](https://github.com/hiromiogawa/claude-memory/commit/de04621ebc1a2961e24e747c66155d2caa1740b0))
* **mcp-server:** add keyword highlighting to search results ([#89](https://github.com/hiromiogawa/claude-memory/issues/89)) ([5c20289](https://github.com/hiromiogawa/claude-memory/commit/5c202890115784c205f835e2a92b02f304c98fc9)), closes [#50](https://github.com/hiromiogawa/claude-memory/issues/50)
* **mcp-server:** add server bootstrap with stdio transport ([9ab3977](https://github.com/hiromiogawa/claude-memory/commit/9ab3977b56a99fb76aa1b9b71d0ce82983bcc994))
* **mcp-server:** add structured logging to all MCP tools ([#68](https://github.com/hiromiogawa/claude-memory/issues/68)) ([1746cf4](https://github.com/hiromiogawa/claude-memory/commit/1746cf4fef2e89b2792dea55e74358929514f402)), closes [#54](https://github.com/hiromiogawa/claude-memory/issues/54)
* **mcp-server:** add unified error handling for MCP tools ([#67](https://github.com/hiromiogawa/claude-memory/issues/67)) ([c86d494](https://github.com/hiromiogawa/claude-memory/commit/c86d4948d08b10e3001e2ae6e011127d02de37d2)), closes [#53](https://github.com/hiromiogawa/claude-memory/issues/53)
* **mcp-server:** implement 6 MCP tools ([543be0a](https://github.com/hiromiogawa/claude-memory/commit/543be0a462d120078f915b1ade00058e1ea0ea1f))
* memory-usageスキル整備とdev-skills統合 ([#93](https://github.com/hiromiogawa/claude-memory/issues/93)) ([#95](https://github.com/hiromiogawa/claude-memory/issues/95)) ([f6affe8](https://github.com/hiromiogawa/claude-memory/commit/f6affe8923ee14634589f65132623416a4983d43))
* move memory strategy to .claude/skills/memory-usage.md ([#84](https://github.com/hiromiogawa/claude-memory/issues/84)) ([247ac3d](https://github.com/hiromiogawa/claude-memory/commit/247ac3dfb62c881f849d06aa35f105d5c8ba43c7)), closes [#80](https://github.com/hiromiogawa/claude-memory/issues/80)
* **storage-postgres:** add drizzle schema with pgvector and pg_bigm indexes ([51ed358](https://github.com/hiromiogawa/claude-memory/commit/51ed35862ddcd6aa69831c7eb24399ddea79073a))
* **storage-postgres:** implement PostgresStorageRepository with pgvector and pg_bigm ([1de07b0](https://github.com/hiromiogawa/claude-memory/commit/1de07b0074aed660f16117d51e17ea0df83037b5))
* **storage-postgres:** pg_bigm similarity検索への切替 ([#16](https://github.com/hiromiogawa/claude-memory/issues/16)) ([90c837e](https://github.com/hiromiogawa/claude-memory/commit/90c837e93d69cfc3d1285fac3fad082b7af1474a))
* **storage-postgres:** コネクションプールの導入 ([#29](https://github.com/hiromiogawa/claude-memory/issues/29)) ([148dcc8](https://github.com/hiromiogawa/claude-memory/commit/148dcc8f214a273b5252feda3437b1ac898f3568))
* **storage-postgres:** タグベース検索・フィルタの実装 ([#20](https://github.com/hiromiogawa/claude-memory/issues/20)) ([fad2d37](https://github.com/hiromiogawa/claude-memory/commit/fad2d372bf574917920167c83a34326cf29064b5))
* strengthen lint rules (jsdoc plugin, no-magic-numbers) ([#34](https://github.com/hiromiogawa/claude-memory/issues/34)) ([b92f999](https://github.com/hiromiogawa/claude-memory/commit/b92f999cd4c7f00dd36acf09b933194e31d698c1)), closes [#33](https://github.com/hiromiogawa/claude-memory/issues/33)
* ドキュメント自動生成の仕組み構築 ([#109](https://github.com/hiromiogawa/claude-memory/issues/109)) ([0a46094](https://github.com/hiromiogawa/claude-memory/commit/0a460943f4e64c3fe82c7af0c9d21ed23c24fa6a))


### Bug Fixes

* **ci:** raw SQLをdrizzle-kit pushに置換 ([#75](https://github.com/hiromiogawa/claude-memory/issues/75)) ([b8ed534](https://github.com/hiromiogawa/claude-memory/commit/b8ed534a5fa826b8d87f805de018500bbf36ed31))
* **ci:** use PAT for release-please to trigger CI on PRs ([#120](https://github.com/hiromiogawa/claude-memory/issues/120)) ([b76e972](https://github.com/hiromiogawa/claude-memory/commit/b76e972399f95007dedef686ba8d43768b0c9278))
* **core:** lower dedup threshold from 0.95 to 0.90 ([#118](https://github.com/hiromiogawa/claude-memory/issues/118)) ([28a7bb2](https://github.com/hiromiogawa/claude-memory/commit/28a7bb24d13b2046944835544b6f35697843fc67)), closes [#114](https://github.com/hiromiogawa/claude-memory/issues/114)
* pre-download ONNX model in Docker image and fix port conflict ([6af9a20](https://github.com/hiromiogawa/claude-memory/commit/6af9a206ad02c9331ceb6bcf147291b4f351532a))
* repair dependency-cruiser configuration ([#60](https://github.com/hiromiogawa/claude-memory/issues/60)) ([c9c2f50](https://github.com/hiromiogawa/claude-memory/commit/c9c2f500f53eaf7651599b19eab5b4da943ada5d)), closes [#45](https://github.com/hiromiogawa/claude-memory/issues/45)
* **storage-postgres:** add distinct timestamps to all test data for stable ordering ([#63](https://github.com/hiromiogawa/claude-memory/issues/63)) ([328b987](https://github.com/hiromiogawa/claude-memory/commit/328b987c39fb0b50634051674e3e004c5cb4567f)), closes [#42](https://github.com/hiromiogawa/claude-memory/issues/42)


### Performance Improvements

* **core:** 重複チェックのN+1問題をPromise.allで並列化 ([#35](https://github.com/hiromiogawa/claude-memory/issues/35)) ([ab5b919](https://github.com/hiromiogawa/claude-memory/commit/ab5b919f88ea122276441e8586522b3fd0470dd0))
* **embedding-onnx:** embedBatch to single pipeline call ([#126](https://github.com/hiromiogawa/claude-memory/issues/126)) ([#139](https://github.com/hiromiogawa/claude-memory/issues/139)) ([0396fb0](https://github.com/hiromiogawa/claude-memory/commit/0396fb08ef37880fe4fa495f4be8ae26413e4a32))
* **embedding-onnx:** parallelize embedBatch with Promise.all ([#21](https://github.com/hiromiogawa/claude-memory/issues/21)) ([c66e980](https://github.com/hiromiogawa/claude-memory/commit/c66e9806d3da59efce4a629c898cabb5b4cc315a)), closes [#10](https://github.com/hiromiogawa/claude-memory/issues/10)
* optimize Docker image size by pruning devDependencies ([#86](https://github.com/hiromiogawa/claude-memory/issues/86)) ([eef275d](https://github.com/hiromiogawa/claude-memory/commit/eef275d218ca9098ed69f599f74856047c090164)), closes [#82](https://github.com/hiromiogawa/claude-memory/issues/82)
* **storage-postgres:** saveBatch を bulk insert に変更 ([#133](https://github.com/hiromiogawa/claude-memory/issues/133)) ([747c6ad](https://github.com/hiromiogawa/claude-memory/commit/747c6adf0916c670d62b22ac768f083fcf8f99fa))
