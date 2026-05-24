# yyds-lang-shiki

`yyds-lang-shiki` is a Shiki language package adapter for the `yyds` syntax. It directly exports a language object that can be used by Shiki.

## Usage (Shiki)

```ts
import { createHighlighter } from 'shiki'
import { yydsLanguage } from 'yyds-lang-shiki'

const highlighter = await createHighlighter({
  themes: ['github-dark'],
  langs: [yydsLanguage]
})

const html = highlighter.codeToHtml('song demo', {
  lang: 'yyds',
  theme: 'github-dark'
})
```

## Usage (Monaco with injected runtime)

```ts
import * as modernMonacoShiki from 'modern-monaco/shiki'
import * as monaco from 'modern-monaco/editor-core'
import { setupYydsMonaco, yydsLanguage } from 'yyds-lang-shiki/monaco'

// Ensure modern-monaco core installs default wasm loader once.
await import('modern-monaco/core')

const highlighter = await modernMonacoShiki.initShiki({
  defaultTheme: 'vitesse-dark',
  langs: [yydsLanguage]
})

modernMonacoShiki.initShikiMonacoTokenizer(monaco, highlighter)

await setupYydsMonaco(monaco, {
  shiki: modernMonacoShiki,
  highlighter
})

const model = monaco.editor.createModel('song "Demo"\ntempo 120', 'yyds')
```

`setupYydsMonaco` now requires host-provided Shiki bindings and a pre-initialized highlighter. This keeps the loader/highlighter lifecycle in one place and avoids duplicate runtime instances in monorepo/link setups.
