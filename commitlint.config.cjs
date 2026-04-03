module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['core', 'embedding-onnx', 'storage-postgres', 'mcp-server', 'hooks', 'deps', 'ci', 'adr'],
    ],
  },
}
