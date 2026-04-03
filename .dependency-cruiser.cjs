/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-must-not-import-infrastructure',
      comment: 'core は外部パッケージに依存してはならない',
      severity: 'error',
      from: { path: 'packages/core/src' },
      to: {
        path: [
          'packages/storage-postgres',
          'packages/embedding-onnx',
          'packages/mcp-server',
          'packages/hooks',
        ],
      },
    },
    {
      name: 'infrastructure-must-not-import-interface',
      comment: 'infrastructure は interface層に依存してはならない',
      severity: 'error',
      from: { path: ['packages/storage-postgres', 'packages/embedding-onnx'] },
      to: { path: ['packages/mcp-server', 'packages/hooks'] },
    },
    {
      name: 'no-circular-deps',
      comment: '循環依存禁止',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
