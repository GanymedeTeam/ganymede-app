import * as path from 'node:path'
import * as url from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
