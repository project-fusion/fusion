/**
 * What a filter field narrows its suggestions by, and what it sends a form,
 * kept apart from the element so each can be read and tested alone.
 */

/**
 * The term being typed at the caret: the run of text since the last space,
 * and after its colon where it has one, so `status:ope` narrows by `ope`.
 */
export const currentTerm = (text: string, caret: number = text.length): string => {
  const before = text.slice(0, caret)
  const word = before.slice(before.search(/\S*$/u))
  const colon = word.indexOf(':')
  return (colon === -1 ? word : word.slice(colon + 1)).replace(/^-/u, '')
}

/**
 * The field the term at the caret is a value of: the word before its colon,
 * without a leading `-`, so `-status:ope` is a value of `status`. Empty where
 * the term has no colon, which is a key being typed.
 */
export const currentField = (text: string, caret: number = text.length): string => {
  const before = text.slice(0, caret)
  const word = before.slice(before.search(/\S*$/u))
  const colon = word.indexOf(':')
  return colon === -1 ? '' : word.slice(0, colon).replace(/^-/u, '')
}

/**
 * The text with a suggestion written over the term at the caret, and where
 * the caret goes after it.
 *
 * The word's field and its colon stay, and a leading `-`, so a value chosen
 * for `-status:op` gives `-status:open`. A space follows, ready for the next
 * term, unless the suggestion ends with a colon, which is a key whose value
 * comes next.
 */
export const completeTerm = (
  text: string,
  caret: number,
  value: string,
): { caret: number; text: string } => {
  const before = text.slice(0, caret)
  const start = before.search(/\S*$/u)
  const word = before.slice(start)
  const colon = word.indexOf(':')
  const kept = colon === -1 ? (word.startsWith('-') ? '-' : '') : word.slice(0, colon + 1)
  const after = text.slice(caret).replace(/^\S*/u, '')
  const space = value.endsWith(':') ? '' : ' '
  const written = `${text.slice(0, start)}${kept}${value}${space}`
  return { caret: written.length, text: `${written}${space ? after.replace(/^\s+/u, '') : after}` }
}

/** One suggestion a `source` gives: its words, or its value with the words a reader sees. */
export type FilterSuggestion =
  | string
  | {
      /** Shown, and skipped by the arrow keys. */
      disabled?: boolean | undefined
      /** What a reader sees. The value where unset. */
      label?: string | undefined
      /** What is written over the term when the suggestion is chosen. */
      value: string
    }

/** What a `source` is asked for. */
export interface FilterSourceRequest {
  /**
   * The field the term is a value of, where the caret is after `field:`, as
   * `currentField` reads it. Empty while a key is being typed.
   */
  field: string
  /** Aborted once a later keystroke asks again, or the field leaves the page. */
  signal: AbortSignal
  /** The term at the caret, after its colon, as `currentTerm` reads it. */
  term: string
  /** The whole text. */
  text: string
}

/**
 * Where the suggestions come from: given the term at the caret, the
 * suggestions for it, or a promise of them.
 */
export type FilterSource = (
  request: FilterSourceRequest,
) => readonly FilterSuggestion[] | PromiseLike<readonly FilterSuggestion[]>

/** Whether a suggestion's words hold the term, ignoring case and accents. */
export const suggests = (words: string, term: string): boolean => {
  const plain = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return term === '' || plain(words).includes(plain(term))
}

/** What a token says about the filter it shows, as `tokenEntry` reads it. */
export interface TokenWords {
  /** The field it filters, from its `name` attribute. */
  readonly field: string | null
  /** The comparison, from its `operator` attribute. */
  readonly operator: string | null
  /** The values it shows, from its text. */
  readonly text: string
  /** What it sends as written, from its `value` attribute. */
  readonly value: string | null
}

/**
 * The form entry for a token's words: its `value` where it has one, or else
 * `field:values`, the way the field reads a filter typed.
 *
 * - The values are the token's text, with the spaces around each comma taken
 *   out: `status:open,pending`.
 * - The comparison named `none`, which a typed `-field:` asks for, leads with a
 *   `-`: `-team:ops`.
 * - Any comparison other than `any` and `none` is written in brackets after
 *   the field, so a chip that says `is after` keeps it: `created[after]:2024`.
 *   `any`, or no `operator`, writes none.
 * - A token naming no field, or showing no values, sends nothing.
 */
export const entryFor = ({ field, operator, text, value }: TokenWords): string | null => {
  if (value !== null) {
    return value
  }
  const values = text.replace(/\s+/gu, ' ').trim()
  if (!field || values === '') {
    return null
  }
  const shown = values.replace(/\s*,\s*/gu, ',')
  if (operator === 'none') {
    return `-${field}:${shown}`
  }
  return operator && operator !== 'any' ? `${field}[${operator}]:${shown}` : `${field}:${shown}`
}

/**
 * The form entry for a slotted token. See `entryFor`. The values are the text
 * of the token's unslotted content, so a name or a comparison slotted into a
 * chip's `field` or `operator` is not read as a value.
 */
export const tokenEntry = (token: Element): string | null =>
  entryFor({
    field: token.getAttribute('name'),
    operator: token.getAttribute('operator'),
    text: [...token.childNodes]
      .filter((node) => !(node.nodeType === 1 && (node as Element).hasAttribute('slot')))
      .map((node) => node.textContent ?? '')
      .join(''),
    value: token.getAttribute('value'),
  })
