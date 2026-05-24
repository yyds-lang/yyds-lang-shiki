import { createHighlighter } from 'shiki'
import { describe, expect, it } from 'vitest'
import { yydsLanguage } from '../src/index'

describe('yyds language export', () => {
  it('exports a valid shiki language object', () => {
    expect(yydsLanguage.name).toBe('yyds')
    expect(yydsLanguage.scopeName).toBe('source.yyds')
    expect(yydsLanguage.patterns.length).toBeGreaterThan(0)
  })

  it('works when loaded via createHighlighter langs option', async () => {
    const highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: [yydsLanguage]
    })

    const html = highlighter.codeToHtml('let v = 1', { lang: 'yyds', theme: 'github-dark' })
    expect(html).toContain('<pre')
    expect(html).toContain('let')
  })

  it('works when loaded via loadLanguage', async () => {
    const highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: []
    })

    await highlighter.loadLanguage(yydsLanguage)
    const html = highlighter.codeToHtml('always "ok"', { lang: 'yyds', theme: 'github-dark' })
    expect(html).toContain('<pre')
    expect(html).toContain('always')
  })
})
