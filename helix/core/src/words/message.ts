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

/**
 * An argument, in short keys because they ship as written: its name (`n`),
 * type (`t`), style (`s`), branches (`b`) and offset (`o`).
 */
interface Argument {
  n: string
  t?: string
  s?: string
  b?: Record<string, Part[]>
  o?: number
}

/** Text, the `#` of a plural (`0`), or an argument. */
type Part = string | 0 | Argument

/** Each message parsed once. Messages are few and come from properties. */
const parsed = new Map<string, Part[]>()

/** A name, a type, a style or a branch key, with the spaces around it. */
const WORD = /\s*([^\s,{}]+)\s*/y

/** The spaces before a branch, or the brace that ends the branches. */
const SPACE = /\s*/y

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
    throw at
  }
  const match = (pattern: RegExp): string => {
    pattern.lastIndex = at
    const found = pattern.exec(source) ?? fail()
    at = pattern.lastIndex
    return found[1] as string
  }
  const take = (char: string): void => {
    if (source[at++] !== char) {
      fail()
    }
  }
  /* Text up to the brace that closes it, where `#` is the count inside a
     plural. An apostrophe before a brace, or before `#` there, quotes text up
     to the next lone apostrophe; two apostrophes are one. */
  const text = (plural: boolean): Part[] => {
    const parts: Part[] = []
    let written = ''
    const flush = (): void => {
      if (written) {
        parts.push(written)
      }
      written = ''
    }
    for (let char = source[at]; char && char !== '}'; char = source[at]) {
      const next = source[++at]
      if (char === "'" && next === "'") {
        written += char
        at++
      } else if (char === "'" && (next === '{' || next === '}' || (plural && next === '#'))) {
        while (at < source.length) {
          const quoted = source[at++]
          if (quoted === "'") {
            if (source[at] !== "'") {
              break
            }
            at++
          }
          written += quoted
        }
      } else if (char === '#' && plural) {
        flush()
        parts.push(0)
      } else if (char === '{') {
        flush()
        parts.push(argument(plural))
      } else {
        written += char
      }
    }
    flush()
    return parts
  }
  const argument = (plural: boolean): Argument => {
    const found: Argument = { n: match(WORD) }
    if (source[at] !== '}') {
      take(',')
      const type = match(WORD)
      found.t = type
      if (source[at] !== '}') {
        take(',')
        if (type !== 'plural' && type !== 'selectordinal' && type !== 'select') {
          const end = source.indexOf('}', at)
          found.s = source.slice(at, end < 0 ? fail() : end).trim()
          at = end
        } else {
          const branches: Record<string, Part[]> = {}
          found.b = branches
          while (source[at] !== '}') {
            let key = match(WORD)
            if (key.startsWith('offset:')) {
              found.o = Number(key.slice(7) || match(WORD))
              key = match(WORD)
            }
            take('{')
            branches[key] = text(type !== 'select' || plural)
            take('}')
            match(SPACE)
          }
        }
      }
    }
    at++
    return found
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
  const isolated = (text: string): string => (options.isolate ? `\u2068${text}\u2069` : text)
  const run = (from: Part[], count: number): string =>
    from
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }
        if (part === 0) {
          return formatNumber(count, locale)
        }
        const { b: branches, n: name, t: type } = part
        const value = values[name]
        if (value === undefined) {
          return `{${name}}`
        }
        if (type === 'number' || (!type && typeof value === 'number')) {
          return isolated(formatNumber(+value, locale, STYLES[part.s as string]))
        }
        if (!branches) {
          return isolated(String(value))
        }
        if (type === 'select') {
          return run(branches[value] ?? branches.other ?? [], count)
        }
        const shifted = +value - (part.o ?? 0)
        const key = `${plurals}|${type}`
        let rule = rules.get(key)
        if (!rule) {
          rule = new Intl.PluralRules(plurals || undefined, {
            type: type === 'plural' ? 'cardinal' : 'ordinal',
          })
          rules.set(key, rule)
        }
        return run(
          branches[`=${value}`] ?? branches[rule.select(shifted)] ?? branches.other ?? [],
          shifted,
        )
      })
      .join('')
  return run(parts, 0)
}
