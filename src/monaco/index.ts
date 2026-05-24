import { yydsLanguageConfiguration } from '@yyds-lang/textmate'
import type * as Monaco from 'monaco-editor'
import { yydsLanguage } from '../language'

type MonacoLike = {
  languages: Pick<typeof Monaco.languages, 'register' | 'setLanguageConfiguration'> &
    Partial<Pick<typeof Monaco.languages, 'getLanguages'>>
}

export type ShikiHighlighter = {
  codeToTokensBase?: (
    code: string,
    options: { lang: string; theme?: string }
  ) => unknown | Promise<unknown>
}

export type ShikiBindings = {
  initShikiMonacoTokenizer: (monaco: unknown, highlighter: ShikiHighlighter) => void
  registerShikiMonacoTokenizer: (
    monaco: unknown,
    highlighter: ShikiHighlighter,
    languageId: string
  ) => void
}

export type SetupYydsMonacoOptions = {
  languageId?: string
  defaultTheme?: string
  shiki: ShikiBindings
  highlighter: ShikiHighlighter
}

const setupCache = new WeakMap<object, Promise<void>>()

export type ShikiSetupErrorCode =
  | 'MISSING_BINDINGS'
  | 'MISSING_HIGHLIGHTER'
  | 'TOKENIZER_REGISTRATION_FAILED'
  | 'TOKENIZER_SMOKE_TEST_FAILED'

export class ShikiSetupError extends Error {
  code: ShikiSetupErrorCode
  cause?: unknown

  constructor(code: ShikiSetupErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'ShikiSetupError'
    this.code = code
    this.cause = cause
  }
}

function toMonacoLanguageConfiguration(): Monaco.languages.LanguageConfiguration {
  return {
    comments: yydsLanguageConfiguration.comments,
    brackets: yydsLanguageConfiguration.brackets,
    autoClosingPairs: yydsLanguageConfiguration.autoClosingPairs,
    surroundingPairs: yydsLanguageConfiguration.surroundingPairs.map(([open, close]) => ({
      open,
      close
    }))
  }
}

function ensureLanguageRegistered(monaco: MonacoLike, languageId: string): void {
  const hasRegisteredLanguage = monaco.languages
    .getLanguages?.()
    .some((language) => language.id === languageId)

  if (!hasRegisteredLanguage) {
    monaco.languages.register({ id: languageId })
  }

  monaco.languages.setLanguageConfiguration(languageId, toMonacoLanguageConfiguration())
}

async function setupTokenizer(
  monaco: MonacoLike,
  languageId: string,
  defaultTheme: string,
  shikiBindings: ShikiBindings,
  highlighter: ShikiHighlighter
): Promise<void> {
  try {
    shikiBindings.initShikiMonacoTokenizer(monaco as typeof Monaco, highlighter)
    shikiBindings.registerShikiMonacoTokenizer(monaco as typeof Monaco, highlighter, languageId)
  } catch (error) {
    throw new ShikiSetupError(
      'TOKENIZER_REGISTRATION_FAILED',
      'Failed to register Shiki tokenizer for YYDS language.',
      error
    )
  }

  if (typeof highlighter.codeToTokensBase === 'function') {
    try {
      await highlighter.codeToTokensBase('song "probe"', {
        lang: languageId,
        theme: defaultTheme
      })
    } catch (error) {
      throw new ShikiSetupError(
        'TOKENIZER_SMOKE_TEST_FAILED',
        'Shiki tokenizer smoke test failed after registration.',
        error
      )
    }
  }
}

export async function setupYydsMonaco(
  monaco: MonacoLike,
  options: SetupYydsMonacoOptions
): Promise<void> {
  const monacoKey = monaco as object
  const cached = setupCache.get(monacoKey)
  if (cached) {
    await cached
    return
  }

  if (!options.shiki) {
    throw new ShikiSetupError(
      'MISSING_BINDINGS',
      'setupYydsMonaco requires explicit Shiki bindings injection.'
    )
  }
  if (!options.highlighter) {
    throw new ShikiSetupError(
      'MISSING_HIGHLIGHTER',
      'setupYydsMonaco requires an initialized Shiki highlighter instance.'
    )
  }

  const languageId = options.languageId ?? yydsLanguage.name
  const defaultTheme = options.defaultTheme ?? 'vitesse-dark'
  const setupPromise = (async () => {
    ensureLanguageRegistered(monaco, languageId)
    await setupTokenizer(monaco, languageId, defaultTheme, options.shiki, options.highlighter)
  })()

  setupCache.set(monacoKey, setupPromise)

  try {
    await setupPromise
  } catch (error) {
    setupCache.delete(monacoKey)
    throw error
  }
}

export { yydsLanguage }
