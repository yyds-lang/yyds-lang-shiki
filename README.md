# yyds-lang-shiki

`yyds-lang-shiki` is a Shiki language package adapter for the `yyds` syntax. It directly exports a language object that can be used by Shiki.

## Usage

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
