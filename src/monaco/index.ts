import { shikiToMonaco } from '@shikijs/monaco'
import { yydsLanguageConfiguration } from '@yyds-lang/textmate'
import type * as Monaco from 'monaco-editor'
import { createHighlighter, type HighlighterCore } from 'shiki'
import { yydsLanguage } from '../language'

type MonacoLike = {
  languages: Pick<typeof Monaco.languages, 'register' | 'setLanguageConfiguration'> &
    Partial<Pick<typeof Monaco.languages, 'getLanguages'>>
}

export type CreateYydsMonacoRuntimeOptions = {
  defaultTheme?: string
  themes?: string[]
  languageId?: string
}

export type ShikiSetupErrorCode =
  | 'INVALID_THEMES_CONFIGURATION'
  | 'HIGHLIGHTER_INIT_FAILED'
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

export type YydsMonacoRuntime = {
  setup: (monaco: MonacoLike) => Promise<void>
  getHighlighter: () => Promise<HighlighterCore>
}

const globalHighlighterCache = new Map<string, Promise<HighlighterCore>>()

function toMonacoPair(
  pair: readonly [string, string] | { open: string; close: string; notIn?: string[] }
): Monaco.languages.IAutoClosingPair {
  if (Array.isArray(pair)) {
    return {
      open: pair[0],
      close: pair[1]
    }
  }

  const objectPair = pair as { open: string; close: string; notIn?: string[] }
  return {
    open: objectPair.open,
    close: objectPair.close,
    ...(objectPair.notIn ? { notIn: [...objectPair.notIn] } : {})
  }
}

function createLanguageConfiguration(): Monaco.languages.LanguageConfiguration {
  return {
    comments: {
      lineComment: yydsLanguageConfiguration.comments.lineComment,
      blockComment: [...yydsLanguageConfiguration.comments.blockComment] as [string, string]
    },
    brackets: yydsLanguageConfiguration.brackets.map(([open, close]) => [open, close]),
    autoClosingPairs: yydsLanguageConfiguration.autoClosingPairs.map((pair) => toMonacoPair(pair)),
    surroundingPairs: yydsLanguageConfiguration.surroundingPairs.map((pair) => toMonacoPair(pair))
  }
}

function freezeLanguageConfiguration(
  config: Monaco.languages.LanguageConfiguration
): Readonly<Monaco.languages.LanguageConfiguration> {
  return Object.freeze({
    ...config,
    comments: config.comments
      ? Object.freeze({
          ...config.comments,
          ...(config.comments.blockComment
            ? { blockComment: Object.freeze([...config.comments.blockComment]) as [string, string] }
            : {})
        })
      : undefined,
    brackets: config.brackets
      ? Object.freeze(config.brackets.map(([open, close]) => Object.freeze([open, close])))
      : undefined,
    autoClosingPairs: config.autoClosingPairs
      ? Object.freeze(
          config.autoClosingPairs.map((pair) =>
            Object.freeze({
              ...pair,
              ...(pair.notIn ? { notIn: Object.freeze([...pair.notIn]) } : {})
            })
          )
        )
      : undefined,
    surroundingPairs: config.surroundingPairs
      ? Object.freeze(
          config.surroundingPairs.map((pair) =>
            Object.freeze({
              ...pair
            })
          )
        )
      : undefined
  }) as unknown as Readonly<Monaco.languages.LanguageConfiguration>
}

export const yydsMonacoLanguageConfiguration = freezeLanguageConfiguration(
  createLanguageConfiguration()
)

function ensureLanguageRegistered(monaco: MonacoLike, languageId: string): void {
  const hasRegisteredLanguage = monaco.languages
    .getLanguages?.()
    .some((language) => language.id === languageId)

  if (!hasRegisteredLanguage) {
    monaco.languages.register({ id: languageId })
  }

  monaco.languages.setLanguageConfiguration(languageId, createLanguageConfiguration())
}

function normalizeRuntimeOptions(options: CreateYydsMonacoRuntimeOptions): {
  defaultTheme: string
  themes: string[]
  languageId: string
  cacheKey: string
} {
  const defaultTheme = options.defaultTheme ?? 'vitesse-dark'
  const providedThemes = options.themes ?? []
  const normalizedThemes = Array.from(new Set([defaultTheme, ...providedThemes]))
  if (normalizedThemes.length === 0) {
    throw new ShikiSetupError(
      'INVALID_THEMES_CONFIGURATION',
      'createYydsMonacoRuntime requires at least one theme.'
    )
  }

  const languageId = options.languageId ?? yydsLanguage.name
  const cacheKey = JSON.stringify({
    themes: normalizedThemes,
    languageId
  })

  return {
    defaultTheme,
    themes: normalizedThemes,
    languageId,
    cacheKey
  }
}

async function createCachedSetup(
  setupCache: WeakMap<object, Promise<void>>,
  monaco: MonacoLike,
  setupAction: () => Promise<void>
): Promise<void> {
  const monacoKey = monaco as object
  const cached = setupCache.get(monacoKey)
  if (cached) {
    await cached
    return
  }

  const setupPromise = setupAction()

  setupCache.set(monacoKey, setupPromise)
  try {
    await setupPromise
  } catch (error) {
    setupCache.delete(monacoKey)
    throw error
  }
}

export function createYydsMonacoRuntime(
  options: CreateYydsMonacoRuntimeOptions = {}
): YydsMonacoRuntime {
  const { defaultTheme, themes, languageId, cacheKey } = normalizeRuntimeOptions(options)
  const setupCache = new WeakMap<object, Promise<void>>()

  async function getHighlighter(): Promise<HighlighterCore> {
    let highlighterPromise = globalHighlighterCache.get(cacheKey)
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes,
        langs: [yydsLanguage]
      })
      globalHighlighterCache.set(cacheKey, highlighterPromise)
    }

    try {
      return await highlighterPromise
    } catch (error) {
      globalHighlighterCache.delete(cacheKey)
      throw new ShikiSetupError(
        'HIGHLIGHTER_INIT_FAILED',
        'Shiki highlighter initialization failed.',
        error
      )
    }
  }

  async function setup(monaco: MonacoLike): Promise<void> {
    await createCachedSetup(setupCache, monaco, async () => {
      ensureLanguageRegistered(monaco, languageId)
      const highlighter = await getHighlighter()
      try {
        shikiToMonaco(highlighter, monaco as typeof Monaco)
      } catch (error) {
        throw new ShikiSetupError(
          'TOKENIZER_REGISTRATION_FAILED',
          'Failed to register Shiki tokenizer for YYDS language.',
          error
        )
      }

      try {
        await highlighter.codeToTokensBase('song "probe"', {
          lang: languageId,
          theme: defaultTheme
        })
      } catch (error) {
        throw new ShikiSetupError(
          'TOKENIZER_SMOKE_TEST_FAILED',
          'Shiki tokenizer smoke test failed after runtime setup.',
          error
        )
      }
    })
  }

  return {
    setup,
    getHighlighter
  }
}

export { yydsLanguage }
