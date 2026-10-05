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

/**
 * What a token sends a form: its `value` attribute, or for a token naming a
 * field, the field and the values it shows, written `field:values` the way the
 * field reads them typed. Nothing for a token that says neither.
 */
export const tokenEntry = (token: Element): string | null => {
  const written = token.getAttribute('value')
  if (written !== null) {
    return written
  }
  const field = token.getAttribute('name')
  const values = (token.textContent ?? '').replace(/\s+/gu, ' ').trim()
  if (!field || values === '') {
    return null
  }
  const negated = token.getAttribute('operator')?.startsWith('not') ? '-' : ''
  return `${negated}${field}:${values.replace(/\s*,\s*/gu, ',')}`
}
