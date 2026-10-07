import type { Message, MessageTable } from './message.js'

/**
 * The words of every family, keyed by the family's styled tag, each with its
 * word properties.
 *
 * Empty here. The styled and headless packages fill it from their manifests,
 * in `types/words.d.ts`, and an element of your own adds its tag the same way:
 *
 * ```ts
 * declare module '@fusion.dev/helix-core' {
 *   interface HelixWords {
 *     'my-uploader': { dropLabel: Message }
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: filled by declaration merging.
export interface HelixWords {}

/**
 * Words for one locale, by tag and property. A tag that `HelixWords` names is
 * checked against it, and any other tag takes any words.
 */
export type Words = {
  readonly [T in keyof HelixWords]?: Readonly<Partial<HelixWords[T]>>
} & {
  readonly [tag: string]: Readonly<Record<string, Message | MessageTable>> | undefined
}

/** One locale's words, by tag, then by property. */
type Pack = Record<string, Record<string, Message | MessageTable>>

/** What the page has registered, kept on `globalThis`. */
interface Held {
  /** Each locale's words, under its lowercase tag. */
  packs: Map<string, Pack>
  /** The locale a server render and a hydrating render speak. */
  fallback: string
  /** What updates the elements that read words. */
  watchers: Set<() => void>
  /** Whether an update is already queued for this task. */
  queued?: boolean
  /** Whether the document's `lang` is watched. */
  observed?: boolean
}

/**
 * The page's words, held on `globalThis`.
 *
 * **One registry for a page that carries two copies of this module**, one per
 * bundle that imports it: words registered through one have to reach elements
 * defined through the other, as the icon registry's glyphs do.
 */
// biome-ignore lint/suspicious/noAssignInExpressions: one registry, made by whichever copy loads first.
const held: Held = ((globalThis as unknown as Record<symbol, Held>)[Symbol.for('helix.words')] ??= {
  fallback: 'en',
  packs: new Map(),
  watchers: new Set(),
})

/** Asks every element that reads words to look again, once per task. */
const changed = (): void => {
  if (!held.queued) {
    held.queued = true
    queueMicrotask(() => {
      held.queued = false
      for (const watcher of held.watchers) {
        watcher()
      }
    })
  }
}

/**
 * Adds words for a locale, merged over the words already registered for it.
 * Elements on the page update once, in a microtask.
 *
 * `locale` is a BCP 47 tag. Name a pack by its full tag where a language has
 * regional forms, such as `pt-BR`, `pt-PT` and `es-419`. A word table, such
 * as Color Picker's `colorWords`, merges entry by entry.
 *
 * ```js
 * registerWords('de', { 'helix-combobox': { emptyText: 'Keine Treffer' } })
 * ```
 */
export const registerWords = (locale: string, ...words: Words[]): void => {
  const key = locale.toLowerCase()
  const pack = held.packs.get(key) ?? {}
  held.packs.set(key, pack)
  for (const one of words) {
    for (const tag in one) {
      // biome-ignore lint/suspicious/noAssignInExpressions: the tag's words, made where it has none.
      const into = (pack[tag] ??= {})
      for (const [name, value] of Object.entries(one[tag] ?? {})) {
        const before = into[name]
        into[name] =
          typeof value === 'object' && typeof before === 'object' ? { ...before, ...value } : value
      }
    }
  }
  changed()
}

/** Removes a locale's words, or every locale's where no locale is given. */
export const clearWords = (locale?: string): void => {
  if (locale === undefined) {
    held.packs.clear()
  } else {
    held.packs.delete(locale.toLowerCase())
  }
  changed()
}

/**
 * Sets the locale an element speaks on a server, and in its first render
 * while it hydrates, where neither its `locale` nor its own `lang` says.
 * Defaults to `en`.
 *
 * **Process-wide**, so it suits a server that renders one language. A server
 * that renders several sets `lang` or `locale` on the elements.
 */
export const setDefaultWordsLocale = (locale: string): void => {
  held.fallback = locale
  changed()
}

/** The locale set with `setDefaultWordsLocale`. */
export const defaultWordsLocale = (): string => held.fallback

/**
 * Asks every element that reads words to update, after an ancestor's `lang`
 * changes. A change to the document's own `lang` is watched for you.
 */
export const refreshWords = (): void => changed()

/** The tags each locale falls back through, worked out once each. */
const chains = new Map<string, string[]>()

/**
 * The locales a word is looked for in, most specific first, ending in `en`.
 *
 * **The script comes before the bare language**, so Hong Kong (`zh-HK`)
 * reaches a Traditional Chinese pack (`zh-Hant`) before a `zh` pack, which is
 * usually Simplified. Unicode extensions are dropped, and a tag `Intl` refuses
 * falls straight to `en`.
 *
 * `de-CH` tries `de-ch`, `de-latn-ch`, `de-latn`, `de`, then `en`.
 */
export const localeChain = (locale: string): string[] => {
  let found = chains.get(locale)
  if (found) {
    return found
  }
  let tags: string[] = []
  try {
    const asked = new Intl.Locale(locale)
    const full = asked.maximize?.()
    const script = `${full?.language}-${full?.script}`
    tags = [
      asked.baseName,
      `${script}-${full?.region}`,
      script,
      `${asked.language}-${asked.region}`,
      asked.language,
    ]
  } catch {
    /* No tag `Intl` takes: English. */
  }
  found = [
    ...new Set(
      [...tags, 'en']
        .filter((tag) => tag && !tag.includes('undefined'))
        .map((tag) => tag.toLowerCase()),
    ),
  ]
  chains.set(locale, found)
  return found
}

/** Whether any words are registered, for a read that can skip the lookup. */
export const wordsRegistered = (): boolean => held.packs.size > 0

/**
 * A registered word for a tag's property in a locale, with the locale it was
 * found in, or `undefined`.
 *
 * **Per key, along the chain.** A `de-CH` pack that holds only the Swiss
 * spellings falls through to `de` for every other word. A word table merges
 * along the chain, the more specific entry winning.
 */
export const lookupWord = (
  locale: string,
  tag: string,
  name: string,
): [Message | MessageTable, string] | undefined => {
  let found: [Message | MessageTable, string] | undefined
  for (const one of localeChain(locale)) {
    const word = held.packs.get(one)?.[tag]?.[name]
    if (word === undefined) {
      continue
    }
    if (typeof word === 'string') {
      return found ?? [word, one]
    }
    found = found ? [{ ...word, ...(found[0] as MessageTable) }, found[1]] : [word, one]
  }
  return found
}

/**
 * Calls `watcher` once in the microtask after words are registered or
 * cleared, or the document's `lang` changes. Returns the function that stops
 * it.
 *
 * The first watcher in a browser starts watching the document's `lang`, once
 * for the page.
 */
export const watchWords = (watcher: () => void): (() => void) => {
  held.watchers.add(watcher)
  if (!held.observed && typeof MutationObserver === 'function' && globalThis.document) {
    held.observed = true
    new MutationObserver(changed).observe(document.documentElement, {
      attributeFilter: ['lang'],
    })
  }
  return () => held.watchers.delete(watcher)
}
