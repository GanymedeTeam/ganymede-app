import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['react', 'typescript', 'import', 'oxc'],
  categories: {
    correctness: 'error',
  },
  rules: {
    'typescript/no-explicit-any': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': 'warn',
    'typescript/no-unused-vars': 'warn',
  },
  ignorePatterns: [
    'dist/**',
    'src-tauri/**',
    'node_modules/**',
    '.claude/**',
    '**/routeTree.gen.ts',
    'src/ipc/bindings.ts',
  ],
})
