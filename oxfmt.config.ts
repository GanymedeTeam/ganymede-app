import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 120,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  sortPackageJson: false,
  sortImports: true,
  sortTailwindcss: {
    stylesheet: './src/main.css',
    functions: ['cn', 'cva', 'clsx'],
  },
  ignorePatterns: [
    'dist/**',
    'src-tauri/**',
    'node_modules/**',
    '.claude/**',
    'src/routeTree.gen.ts',
    'src/ipc/bindings.ts',
    '**/*.md',
    '**/*.yaml',
    '**/*.yml',
  ],
})
