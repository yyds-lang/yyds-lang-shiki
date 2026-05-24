import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({
  createHighlighter: vi.fn(async () => ({
    codeToTokensBase: vi.fn(async () => undefined)
  })),
  shikiToMonaco: vi.fn()
}))

vi.mock('shiki', () => ({
  createHighlighter: mocked.createHighlighter
}))

vi.mock('@shikijs/monaco', () => ({
  shikiToMonaco: mocked.shikiToMonaco
}))

import { createYydsMonacoRuntime } from '../src/monaco'

function createMockMonaco() {
  return {
    languages: {
      register: vi.fn(),
      getLanguages: vi.fn(() => []),
      setLanguageConfiguration: vi.fn()
    }
  }
}

describe('createYydsMonacoRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses a singleton highlighter for same runtime', async () => {
    const runtime = createYydsMonacoRuntime()
    const monaco = createMockMonaco()

    await runtime.setup(monaco)
    await runtime.setup(monaco)

    expect(mocked.createHighlighter).toHaveBeenCalledOnce()
  })

  it('configures language and tokenizer once per monaco instance', async () => {
    const runtime = createYydsMonacoRuntime()
    const monaco = createMockMonaco()

    await runtime.setup(monaco)
    await runtime.setup(monaco)

    expect(monaco.languages.register).toHaveBeenCalledOnce()
    expect(monaco.languages.setLanguageConfiguration).toHaveBeenCalledOnce()
    expect(mocked.shikiToMonaco).toHaveBeenCalledOnce()
  })

  it('reuses highlighter across runtime instances with same options', async () => {
    const runtimeA = createYydsMonacoRuntime({
      defaultTheme: 'github-dark',
      themes: ['github-dark']
    })
    const runtimeB = createYydsMonacoRuntime({
      defaultTheme: 'github-dark',
      themes: ['github-dark']
    })
    const monacoA = createMockMonaco()
    const monacoB = createMockMonaco()

    await runtimeA.setup(monacoA)
    await runtimeB.setup(monacoB)

    expect(mocked.createHighlighter).toHaveBeenCalledOnce()
  })

  it('supports themes without explicitly including defaultTheme', async () => {
    const runtime = createYydsMonacoRuntime({
      defaultTheme: 'vitesse-dark',
      themes: ['github-dark']
    })
    const monaco = createMockMonaco()

    await runtime.setup(monaco)

    expect(mocked.createHighlighter).toHaveBeenCalledWith(
      expect.objectContaining({
        themes: ['vitesse-dark', 'github-dark']
      })
    )
  })

  it('throws typed error when shikiToMonaco registration fails', async () => {
    mocked.shikiToMonaco.mockImplementationOnce(() => {
      throw new Error('register fail')
    })
    const runtime = createYydsMonacoRuntime()

    await expect(runtime.setup(createMockMonaco())).rejects.toMatchObject({
      name: 'ShikiSetupError',
      code: 'TOKENIZER_REGISTRATION_FAILED'
    })
  })

  it('throws typed error when highlighter init fails', async () => {
    mocked.createHighlighter.mockImplementationOnce(async () => {
      throw new Error('init fail')
    })
    const runtime = createYydsMonacoRuntime({ defaultTheme: 'nord' })

    await expect(runtime.setup(createMockMonaco())).rejects.toMatchObject({
      name: 'ShikiSetupError',
      code: 'HIGHLIGHTER_INIT_FAILED'
    })
  })

  it('throws typed error when smoke test fails', async () => {
    mocked.createHighlighter.mockImplementationOnce(async () => ({
      codeToTokensBase: vi.fn(async () => {
        throw new Error('smoke fail')
      })
    }))
    const runtime = createYydsMonacoRuntime({ defaultTheme: 'smoke-dark' })

    await expect(runtime.setup(createMockMonaco())).rejects.toMatchObject({
      name: 'ShikiSetupError',
      code: 'TOKENIZER_SMOKE_TEST_FAILED'
    })
  })
})
