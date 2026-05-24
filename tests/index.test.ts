import { createHighlighter } from 'shiki'
import { describe, expect, it, vi } from 'vitest'
import { yydsLanguage } from '../src/index'
import { setupYydsMonaco, yydsLanguage as yydsLanguageFromMonaco } from '../src/monaco'

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

  it('applies monaco language setup via helper', async () => {
    const register = vi.fn()
    const setLanguageConfiguration = vi.fn(() => ({ dispose: vi.fn() }))
    const highlighter = {
      codeToTokensBase: vi.fn(async () => undefined)
    }
    const initShikiMonacoTokenizer = vi.fn()
    const registerShikiMonacoTokenizer = vi.fn()
    const monaco = {
      languages: {
        register,
        setLanguageConfiguration
      }
    }

    await setupYydsMonaco(monaco, {
      shiki: {
        initShikiMonacoTokenizer,
        registerShikiMonacoTokenizer
      },
      highlighter
    })

    expect(register).toHaveBeenCalledWith({ id: 'yyds' })
    expect(highlighter.codeToTokensBase).toHaveBeenCalledOnce()
    expect(initShikiMonacoTokenizer).toHaveBeenCalledOnce()
    expect(registerShikiMonacoTokenizer).toHaveBeenCalledWith(monaco, expect.anything(), 'yyds')
    expect(setLanguageConfiguration).toHaveBeenCalledOnce()
    expect(setLanguageConfiguration).toHaveBeenCalledWith(
      'yyds',
      expect.objectContaining({
        comments: {
          lineComment: '//',
          blockComment: ['/*', '*/']
        }
      })
    )
  })

  it('does not register when language already exists', async () => {
    const register = vi.fn()
    const setLanguageConfiguration = vi.fn(() => ({ dispose: vi.fn() }))
    const highlighter = {
      codeToTokensBase: vi.fn(async () => undefined)
    }
    const monaco = {
      languages: {
        register,
        setLanguageConfiguration,
        getLanguages: vi.fn(() => [{ id: 'yyds' }])
      }
    }

    await setupYydsMonaco(monaco, {
      shiki: {
        initShikiMonacoTokenizer: vi.fn(),
        registerShikiMonacoTokenizer: vi.fn()
      },
      highlighter
    })

    expect(register).not.toHaveBeenCalled()
    expect(highlighter.codeToTokensBase).toHaveBeenCalledOnce()
    expect(setLanguageConfiguration).toHaveBeenCalledOnce()
  })

  it('is idempotent for the same monaco instance', async () => {
    const register = vi.fn()
    const setLanguageConfiguration = vi.fn(() => ({ dispose: vi.fn() }))
    const highlighter = {
      codeToTokensBase: vi.fn(async () => undefined)
    }
    const monaco = {
      languages: {
        register,
        setLanguageConfiguration
      }
    }

    const shiki = {
      initShikiMonacoTokenizer: vi.fn(),
      registerShikiMonacoTokenizer: vi.fn()
    }

    await setupYydsMonaco(monaco, { shiki, highlighter })
    await setupYydsMonaco(monaco, { shiki, highlighter })

    expect(register).toHaveBeenCalledOnce()
    expect(setLanguageConfiguration).toHaveBeenCalledOnce()
    expect(highlighter.codeToTokensBase).toHaveBeenCalledOnce()
  })

  it('throws typed error when shiki bindings are missing', async () => {
    const monaco = {
      languages: {
        register: vi.fn(),
        setLanguageConfiguration: vi.fn(() => ({ dispose: vi.fn() }))
      }
    }

    await expect(
      setupYydsMonaco(monaco, {
        highlighter: {
          codeToTokensBase: vi.fn(async () => undefined)
        },
        shiki: undefined as never
      })
    ).rejects.toMatchObject({
      name: 'ShikiSetupError',
      code: 'MISSING_BINDINGS'
    })
  })

  it('throws typed error when tokenizer smoke test fails', async () => {
    const monaco = {
      languages: {
        register: vi.fn(),
        setLanguageConfiguration: vi.fn(() => ({ dispose: vi.fn() }))
      }
    }

    await expect(
      setupYydsMonaco(monaco, {
        shiki: {
          initShikiMonacoTokenizer: vi.fn(),
          registerShikiMonacoTokenizer: vi.fn()
        },
        highlighter: {
          codeToTokensBase: vi.fn(async () => {
            throw new Error('boom')
          })
        }
      })
    ).rejects.toMatchObject({
      name: 'ShikiSetupError',
      code: 'TOKENIZER_SMOKE_TEST_FAILED'
    })
  })
})
