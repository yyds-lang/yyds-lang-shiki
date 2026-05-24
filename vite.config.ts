import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**']
  },
  staged: {
    '*': 'vp check --fix'
  },
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none'
  },
  pack: {
    entry: {
      index: 'src/index.ts',
      monaco: 'src/monaco/index.ts'
    },
    dts: true,
    sourcemap: false,
    deps: {
      neverBundle: ['monaco-editor', 'modern-monaco']
    },
    exports: true,
    format: ['esm'],
    outDir: 'dist'
  }
})
