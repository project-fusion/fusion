import { formatNumber } from '../utils/number-format/number-format.js'

/**
 * A sentence a component says, written in a small subset of ICU
 * MessageFormat, the syntax translation tools already read:
 *
 * - `{name}`, a value put in where the sentence says. A number is written in
 *   the element's locale.
 * - `{n, number}`, `{n, number, percent}` and `{n, number, integer}`.
 * - `{n, plural, =0 {...} one {# ...} other {...}}`, with `offset:`, and
 *   `{n, selectordinal, ...}` in the same shape. `#` is the number.
 * - `{x, select, a {...} other {...}}`.
 * - `''` for one apostrophe, and `'{'` for a brace written as text. A lone
 *   apostrophe is text, so "L'élément" needs no escaping.
 */
export type Message = string

/** A word table, such as `color-words`. Its entries merge one by one. */
export type MessageTable = Readonly<Record<string, Message>>

/** The values a message puts in, by name. */
export type MessageValues = Readonly<Record<string, string | number>>

/** How a message is formatted. */
export interface MessageOptions {
  /**
   * Wraps each value in Unicode isolates (U+2068 and U+2069), so a number or
   * a Latin name keeps its order inside a right-to-left sentence.
   */
  isolate?: boolean
  /**
   * The locale whose plural rules pick a form, where it is not the locale
   * the numbers are written in. A message from the English fallback counts
   * with English rules on a Polish page, because its forms are English.
   */
  plurals?: string
}

/** An argument: its name, type, style, branches and offset. */
interface Argument {
  name: string
  type?: string
  style?: string
  branches?: Record<string, Part[]>
  offset?: number
}

/** Text, the `#` of a plural (`0`), or an argument. */
type Part = string | 0 | Argument

/** Each message parsed once. Messages are few and come from properties. */
const parsed = new Map<string, Part[]>()

/**
 * The parts of a message.
 *
 * **A message that does not parse is its own text.** A typo in a translation
 * then shows on the page as written, where a reader reports it, and the
 * component keeps working.
 */
const parse = (source: string): Part[] => {
  let at = 0
  const fail = (): never => {
    throw new SyntaxError(source)
  }
  const word = (): string => {
    const found = /^\s*([^\s,{}]+)\s*/.exec(source.slice(at))
    if (!found) {
      fail()
    }
    at += (found as RegExpExecArray)[0].length
    return (found as RegExpExecArray)[1] as string
  }
  const take = (char: string): void => {
    while (/\s/.test(source[at] ?? '')) {
      at++
    }
    if (source[at++] !== char) {
      fail()
    }
  }
  const text = (inPlural: boolean): Part[] => {
    const parts: Part[] = []
    let written = ''
    const flush = (): void => {
      if (written) {
        parts.push(written)
        written = ''
      }
    }
    while (at < source.length) {
      const char = source[at] as string
      const next = source[at + 1]
      if (char === "'" && next === "'") {
        written += "'"
        at += 2
      } else if (char === "'" && (next === '{' || next === '}' || (inPlural && next === '#'))) {
        /* Quoted text runs to the next lone apostrophe. */
        at++
        while (at < source.length) {
          if (source[at] === "'") {
            if (source[at + 1] !== "'") {
              at++
              break
            }
            at++
          }
          written += source[at++]
        }
      } else if (char === '}') {
        break
      } else if (char === '#' && inPlural) {
        flush()
        parts.push(0)
        at++
      } else if (char === '{') {
        flush()
        at++
        parts.push(argument(inPlural))
      } else {
        written += char
        at++
      }
    }
    flush()
    return parts
  }
  const argument = (inPlural: boolean): Argument => {
    const name = word()
    if (source[at] === '}') {
      at++
      return { name }
    }
    take(',')
    const type = word()
    if (source[at] === '}') {
      at++
      return { name, type }
    }
    take(',')
    if (type !== 'plural' && type !== 'selectordinal' && type !== 'select') {
      const end = source.indexOf('}', at)
      if (end < 0) {
        fail()
      }
      const style = source.slice(at, end).trim()
      at = end + 1
      return { name, style, type }
    }
    const branches: Record<string, Part[]> = {}
    let offset = 0
    while (source[at] !== '}') {
      let key = word()
      if (key.startsWith('offset:')) {
        offset = Number(key.slice(7) || word())
        key = word()
      }
      take('{')
      branches[key] = text(type !== 'select' || inPlural)
      take('}')
      while (/\s/.test(source[at] ?? '')) {
        at++
      }
      if (at >= source.length) {
        fail()
      }
    }
    at++
    return { branches, name, offset, type }
  }
  try {
    const parts = text(false)
    return at < source.length ? fail() : parts
  } catch {
    return [source]
  }
}

/** The plural rules of a locale, built once each. */
const rules = new Map<string, Intl.PluralRules>()

const pluralOf = (locale: string, type: Intl.PluralRuleType, count: number): string => {
  const key = `${locale}|${type}`
  let found = rules.get(key)
  if (!found) {
    found = new Intl.PluralRules(locale || undefined, { type })
    rules.set(key, found)
  }
  return found.select(count)
}

/** The `Intl.NumberFormat` options a number argument's style names. */
const STYLES: Record<string, Intl.NumberFormatOptions> = {
  integer: { maximumFractionDigits: 0 },
  percent: { style: 'percent' },
}

/**
 * A message with its values put in, its numbers written in `locale`, and its
 * plural forms picked by the rules of `options.plurals`, or of `locale`.
 *
 * **A value that is missing leaves its placeholder as written**, so
 * `{count}` shows on the page as the mistake it is. An unknown argument type
 * writes the value as text, so a type added later changes only the messages
 * that use it.
 *
 * ```js
 * formatMessage('{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}', { count: 5 }, 'pl')
 * // '5 wyników'
 * ```
 */
export const formatMessage = (
  message: Message,
  values: MessageValues,
  locale: string,
  options: MessageOptions = {},
): string => {
  let parts = parsed.get(message)
  if (!parts) {
    parts = parse(message)
    parsed.set(message, parts)
  }
  const plurals = options.plurals ?? locale
  const isolated = (text: string): string => (options.isolate ? `⁨${text}⁩` : text)
  const run = (from: Part[], count: number): string =>
    from
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (part === 0) {
          return formatNumber(count, locale)
        }
        const value = values[part.name]
        if (value === undefined) {
          return `{${part.name}}`
        }
        if (part.type === 'number' || (part.type === undefined && typeof value === 'number')) {
          return isolated(formatNumber(Number(value), locale, STYLES[part.style ?? '']))
        }
        if (!part.branches) {
          return isolated(String(value))
        }
        if (part.type === 'select') {
          return run(part.branches[String(value)] ?? part.branches.other ?? [], count)
        }
        const shifted = Number(value) - (part.offset ?? 0)
        const form = pluralOf(plurals, part.type === 'plural' ? 'cardinal' : 'ordinal', shifted)
        return run(
          part.branches[`=${value}`] ?? part.branches[form] ?? part.branches.other ?? [],
          shifted,
        )
      })
      .join('')
  return run(parts, 0)
}
