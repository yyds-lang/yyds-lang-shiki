import { createHighlighter } from 'shiki'
import { describe, expect, it } from 'vitest'
import {
  createYydsMonacoRuntime,
  yydsLanguage,
  yydsMonacoLanguageConfiguration
} from '../src/index'
import { yydsLanguage as yydsLanguageFromMonaco } from '../src/monaco'

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

    const html = highlighter.codeToHtml('song "demo"\ntempo 120', {
      lang: 'yyds',
      theme: 'github-dark'
    })
    expect(html).toContain('<pre')
    expect(html).toContain('song')
    expect(html).toContain('tempo')
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

  it('also exports yyds language from monaco entry', () => {
    expect(yydsLanguageFromMonaco.name).toBe('yyds')
    expect(yydsLanguageFromMonaco.scopeName).toBe('source.yyds')
  })

  it('exports monaco language configuration', () => {
    expect(yydsMonacoLanguageConfiguration).toMatchObject({
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      }
    })
  })

  it('exposes immutable monaco language configuration', () => {
    expect(Object.isFrozen(yydsMonacoLanguageConfiguration)).toBe(true)
    expect(() => {
      ;(yydsMonacoLanguageConfiguration.comments as { lineComment: string }).lineComment = '#'
    }).toThrow()
  })

  it('creates runtime from root entry', () => {
    const runtime = createYydsMonacoRuntime()
    expect(runtime).toMatchObject({
      setup: expect.any(Function),
      getHighlighter: expect.any(Function)
    })
  })
})
