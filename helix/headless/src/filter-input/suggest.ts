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
