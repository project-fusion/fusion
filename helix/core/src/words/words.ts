import type { ReactiveController, ReactiveElement } from 'lit'
import { held, watchWords, wordsRegistered } from './held.js'
import { formatMessage, type MessageTable, type MessageValues } from './message.js'
import { wordsLocale } from './words-locale.js'

/** An element that reads words: a Lit element, perhaps with a `locale`. */
type Host = ReactiveElement & { locale?: string | undefined }

/**
 * What an element holds for one word property, in short keys because they
 * ship as written: its English (`e`), the value set on it after construction,
 * which wins (`o`), what it last resolved to, to tell whether an update
 * changes it (`l`), and how many initializers have set it (`i`).
 */
interface Held {
  e?: unknown
  o?: unknown
  l?: unknown
  i: number
}

/** Where an element keeps its word properties, by name. */
const HELD = Symbol()

/** An element's word properties, which none has before its first is set. */
const heldBy = (host: object): Record<string, Held> =>
  (host as { [HELD]?: Record<string, Held> })[HELD] ?? {}

/** The word properties each prototype declares. */
const declared = new WeakMap<object, Set<string>>()

/**
 * How many classes an element is made from declare `name` a word property,
 * each with an initializer: the sets its construction makes, each an English
 * the next replaces. A family that overrides a mixin's English with its own
 * writes `@words` above the override, and its initializer, which runs last,
 * is the English.
 */
const initializers = (host: object, name: string): number => {
  let count = 0
  for (let proto = Object.getPrototypeOf(host); proto; proto = Object.getPrototypeOf(proto)) {
    count += declared.get(proto)?.has(name) ? 1 : 0
  }
  return count
}

/**
 * A word property's value, and the locale its plural forms are in: yours, in
 * the element's locale; a registered word, in the locale it was found in; or
 * the English, in `en`.
 */
const resolve = (host: Host, name: string): [unknown, string] => {
  const word = heldBy(host)[name]
  /* A property no `@words` declares is read as it is, in the element's
     locale, so a shared helper formats a family that has not moved yet. */
  if (!word) {
    return [host[name as keyof Host], '']
  }
  const { e: english, o: own } = word
  const table = typeof english === 'object' && (english as MessageTable | null)
  let found: [unknown, string] = [own, '']
  if (own == null || table) {
    const registered = wordsRegistered()
      ? held.find?.(host, (host.constructor as { words?: string }).words || host.localName, name)
      : undefined
    found = table
      ? [{ ...table, ...(registered?.[0] as MessageTable), ...(own as MessageTable) }, '']
      : (registered ?? [english, 'en'])
  }
  word.l = found[0]
  return found
}

/** The same words, compared by value where a word is a table. */
const same = (one: unknown, two: unknown): boolean =>
  one === two || JSON.stringify(one) === JSON.stringify(two)

/** Updates an element whose words now resolve to something else, naming each one. */
const recheck = (host: Host): void => {
  for (const [name, word] of Object.entries(heldBy(host))) {
    const before = word.l
    if ('l' in word && !same(before, resolve(host, name)[0])) {
      host.requestUpdate(name, before)
    }
  }
}

/**
 * Watches the registry while the element is connected, and looks again after
 * hydrating. An element whose locale changes with a `lang` updates even where
 * no word of its own changes, so its numbers are written in the new locale.
 */
const watcher = (host: Host): ReactiveController => {
  let stop: (() => void) | undefined
  let locale = ''
  return {
    hostConnected: () => {
      locale = held.locale?.(host) ?? ''
      stop = watchWords(() => {
        recheck(host)
        const now = held.locale?.(host) ?? ''
        if (now !== locale) {
          locale = now
          host.requestUpdate()
        }
      })
    },
    hostDisconnected: () => stop?.(),
    /* After the hydrating render, which read only the element's own
       attributes, the words are read again with the nearest `lang`. An
       element whose words differ updates once. */
    hostUpdated: () => {
      if ((host as { hydrating?: boolean }).hydrating === true) {
        queueMicrotask(() => recheck(host))
      }
    },
  }
}

/**
 * Makes a property a word property: one a page can set, register for a
 * locale with `registerWords`, or leave in English. Written above
 * `@property`, which declares its attribute:
 *
 * ```ts
 * static words = 'helix-combobox'
 *
 * @words
 * @property({ attribute: 'empty-text' })
 * emptyText = 'No matches'
 * ```
 *
 * **Reading the property gives the word in the element's locale**: a value
 * you set, then the words registered for the element's locale, then the
 * initializer, which is the English. Setting any value, the English included,
 * makes it yours. Setting `null` or `undefined`, or removing the attribute,
 * gives the registry's word back. So does an empty validation message, a
 * property whose name ends in `Message`: a field never reports a failed check
 * with no sentence, and a template that renders an empty variable into
 * `range-overflow-message=""` gets the built-in sentence.
 *
 * **A subclass or a family that overrides a word's English writes `@words`
 * above the override**, and its initializer is the English: a family's
 * `Remove filter` over a mixin's `Dismiss`. Every `@words` declaration has an
 * initializer, so an element knows how many of its sets are English.
 *
 * The class's static `words` names the key its words are registered under, the
 * family's styled tag, so the headless and styled tiers share one key. A mixin
 * that declares words writes `static words = ''`, which its host's key
 * replaces; a host with no key of its own reads its tag name. An element whose
 * words change updates once, with each changed property named.
 */
export const words = (proto: object, name: string): void => {
  if (!Object.getOwnPropertyDescriptor(proto, name)) {
    ;(proto.constructor as typeof ReactiveElement).createProperty(name)
  }
  const names = declared.get(proto) ?? new Set()
  declared.set(proto, names.add(name))
  Object.defineProperty(proto, name, {
    configurable: true,
    enumerable: true,
    get(this: Host): unknown {
      return resolve(this, name)[0]
    },
    set(this: Host & { [HELD]?: Record<string, Held> }, value: unknown) {
      /* The first word an element receives, in its constructor, starts it
         watching the registry. */
      if (!this[HELD]) {
        this[HELD] = {}
        this.addController(watcher(this))
      }
      // biome-ignore lint/suspicious/noAssignInExpressions: made on the first value the property receives.
      const word = (this[HELD][name] ??= { i: 0 })
      /* Each initializer is English, the most derived class's last: they run
         in the constructor, before an attribute, a property a framework sets,
         or a value saved from before the element upgraded. */
      if (word.i < initializers(this, name)) {
        word.i++
        word.e = value
        this.requestUpdate(name, undefined, undefined, true, value)
        return
      }
      const before = this[name as keyof Host]
      word.o = value === '' && name.endsWith('Message') ? undefined : value
      this.requestUpdate(name, before)
    },
  })
}

/**
 * A word property of an element, formatted: its values put in, its numbers
 * written in the element's locale, and its plural forms picked by the rules
 * of the language its words are in. A property no `@words` declares is
 * formatted as it reads, with the element's own plural rules.
 *
 * ```ts
 * formatWords(this, 'resultsLabel', { count: 3 }) // '3 results'
 * ```
 */
export const formatWords = (host: Host, name: string, values: MessageValues = {}): string => {
  const [message, from] = resolve(host, name)
  const locale = wordsLocale(host)
  return formatMessage(String(message ?? ''), values, locale, { plurals: from || locale })
}
