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

## Usage (Monaco Runtime API)

```ts
import { init } from 'modern-monaco/core'
import { createYydsMonacoRuntime } from 'yyds-lang-shiki/monaco'

const monaco = await init({
  defaultTheme: 'vitesse-dark'
})

const runtime = createYydsMonacoRuntime({
  defaultTheme: 'vitesse-dark'
})

await runtime.setup(monaco)

const model = monaco.editor.createModel('song "Demo"\ntempo 120', 'yyds')
```

`createYydsMonacoRuntime()` provides a typed singleton highlighter workflow based on official `shiki` + `@shikijs/monaco`, and avoids direct usage of untyped `modern-monaco/shiki` subpath imports in app code.
