import type { Message, MessageTable } from './message.js'

/** One locale's words, by tag, then by property. */
export type Pack = Record<string, Record<string, Message | MessageTable>>

/** An element that reads words, perhaps with a `locale`. */
export type Speaker = Element & { locale?: string | undefined }

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
  /** Finds a registered word for an element, set by the first `registerWords`. */
  find?: (host: Speaker, tag: string, name: string) => [Message | MessageTable, string] | undefined
  /** Reads the locale an element speaks, set where `wordsLocale` is loaded. */
  locale?: (host: Speaker) => string
}

/**
 * The page's words, held on `globalThis`.
 *
 * **One registry for a page that carries two copies of this module**, one per
 * bundle that imports it: words registered through one have to reach elements
 * defined through the other, as the icon registry's glyphs do.
 *
 * **What every element reads, and nothing more.** An element with a word
 * property reads its English until a page registers words, so the lookup and
 * the locale chain arrive with `registerWords`, which puts its lookup in
 * `find`, and the locale with `wordsLocale`, which puts itself in `locale`. A
 * page that registers no words and formats no numbers ships neither: measured
 * on Button, 474 bytes of its 13,437 compressed.
 */
// biome-ignore lint/suspicious/noAssignInExpressions: one registry, made by whichever copy loads first.
export const held: Held = ((globalThis as unknown as Record<symbol, Held>)[
  Symbol.for('helix.words')
] ??= {
  fallback: 'en',
  packs: new Map(),
  watchers: new Set(),
})

/** Asks every element that reads words to look again, once per task. */
export const changed = (): void => {
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

/** Whether any words are registered, for a read that can skip the lookup. */
export const wordsRegistered = (): boolean => held.packs.size > 0

/**
 * Starts watching the document's `lang`, once for the page, in a browser.
 * Called by what a `lang` change reaches: registered words, and a locale read.
 */
export const watchLang = (): void => {
  if (!held.observed && typeof MutationObserver === 'function' && globalThis.document) {
    held.observed = true
    new MutationObserver(changed).observe(document.documentElement, {
      attributeFilter: ['lang'],
    })
  }
}

/**
 * Calls `watcher` once in the microtask after words are registered or
 * cleared, or the document's `lang` changes. Returns the function that stops
 * it.
 */
export const watchWords = (watcher: () => void): (() => void) => {
  held.watchers.add(watcher)
  return () => held.watchers.delete(watcher)
}
