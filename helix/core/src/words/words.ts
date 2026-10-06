import type { ReactiveController, ReactiveElement } from 'lit'
import { formatMessage, type MessageTable, type MessageValues } from './message.js'
import { lookupWord, watchWords, wordsRegistered } from './registry.js'
import { wordsLocale } from './words-locale.js'

/** An element that reads words: a Lit element, perhaps with a `locale`. */
type Host = ReactiveElement & { locale?: string | undefined }

/** What an element holds for its word properties. */
interface Held {
  /** Each property's English, its initializer. */
  english: Map<string, unknown>
  /** What was set after construction: yours, which wins. */
  own: Map<string, unknown>
  /** What each property last resolved to, to tell whether an update changes it. */
  last: Map<string, unknown>
}

const elements = new WeakMap<object, Held>()

const heldBy = (host: object): Held => {
  let found = elements.get(host)
  if (!found) {
    found = { english: new Map(), last: new Map(), own: new Map() }
    elements.set(host, found)
  }
  return found
}

/** Whether a class's elements already watch the registry, inherited by subclasses. */
const WATCHED = Symbol('words watched')

/**
 * A word property's value, and the locale its plural forms are in: yours, in
 * the element's locale; a registered word, in the locale it was found in; or
 * the English, in `en`.
 */
const resolve = (host: Host, name: string): [unknown, string] => {
  const held = heldBy(host)
  /* A property no `@words` declares is read as it is, in the element's
     locale, so a shared helper formats a family that has not moved yet. */
  if (!held.english.has(name)) {
    return [host[name as keyof Host], '']
  }
  const own = held.own.get(name)
  const english = held.english.get(name)
  let found: [unknown, string] = [own, '']
  if (own == null || typeof english === 'object') {
    const registered = wordsRegistered()
      ? lookupWord(
          wordsLocale(host),
          (host.constructor as { words?: string }).words ?? host.localName,
          name,
        )
      : undefined
    found =
      typeof english === 'object' && english !== null
        ? [{ ...english, ...(registered?.[0] as MessageTable), ...(own as MessageTable) }, '']
        : (registered ?? [english, 'en'])
  }
  held.last.set(name, found[0])
  return found
}

/** The same words, compared by value where a word is a table. */
const same = (one: unknown, two: unknown): boolean =>
  one === two ||
  (typeof one === 'object' &&
    typeof two === 'object' &&
    JSON.stringify(one) === JSON.stringify(two))

/** Updates an element whose words now resolve to something else, naming each one. */
const recheck = (host: Host): void => {
  for (const [name, before] of heldBy(host).last) {
    if (!same(before, resolve(host, name)[0])) {
      host.requestUpdate(name, before)
    }
  }
}

/** Watches the registry while the element is connected, and looks again after hydrating. */
class WordsController implements ReactiveController {
  private stop: (() => void) | undefined

  constructor(private readonly host: Host) {}

  hostConnected(): void {
    this.stop = watchWords(() => recheck(this.host))
  }

  hostDisconnected(): void {
    this.stop?.()
    this.stop = undefined
  }

  /**
   * After the hydrating render, which read only the element's own attributes,
   * the words are read again with the nearest `lang`. An element whose words
   * differ updates once.
   */
  hostUpdated(): void {
    if ((this.host as { hydrating?: boolean }).hydrating === true) {
      queueMicrotask(() => recheck(this.host))
    }
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
 * gives the registry's word back.
 *
 * The class's static `words` names the key its words are registered under, the
 * family's styled tag, so the headless and styled tiers share one key. An
 * element whose words change updates once, with each changed property named.
 */
export const words = (proto: object, name: string): void => {
  const ctor = proto.constructor as typeof ReactiveElement & { [WATCHED]?: true }
  if (!Object.getOwnPropertyDescriptor(proto, name)) {
    ctor.createProperty(name)
  }
  if (!ctor[WATCHED]) {
    ctor[WATCHED] = true
    ctor.addInitializer((host) => {
      host.addController(new WordsController(host as Host))
    })
  }
  Object.defineProperty(proto, name, {
    configurable: true,
    enumerable: true,
    get(this: Host): unknown {
      return resolve(this, name)[0]
    },
    set(this: Host, value: unknown) {
      const held = heldBy(this)
      /* The initializer is the first value any element receives: it runs in
         the constructor, before an attribute, a property a framework sets, or
         a value saved from before the element upgraded. */
      if (!held.english.has(name)) {
        held.english.set(name, value)
        this.requestUpdate(name, undefined, undefined, true, value)
        return
      }
      const before = this[name as keyof Host]
      held.own.set(name, value)
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
