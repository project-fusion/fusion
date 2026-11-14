/**
 * The text of a field that holds dates or times, typed or picked, with no
 * element in it: one, a range of two, or several. Date Input and Time Input
 * read their values through these on the web and on a phone, each handing in
 * what makes one of its values whole and how it writes and reads one.
 */

/** One, a range of two, or several. */
export type PickerMode = 'multiple' | 'range' | 'single'

/** How a field tells, writes, and reads back one of its values. */
export interface PickerKind {
  /** Whether one value is whole, as `2026-08-24` or `14:30`. */
  readonly whole: (one: string) => boolean
  /** One value as the field shows it, or as it is where it is not whole. */
  readonly written: (one: string) => string
  /** A written value read back, or the empty string where it reads as none. */
  readonly read: (text: string) => string
}

/**
 * Every value a field's text holds. The en dash and the spaced hyphen both
 * mean "to", because a range is shown that way and what is shown is what gets
 * typed back. An ISO date holds hyphens of its own, so only a spaced one
 * separates.
 */
export const heldValues = (value: string): string[] =>
  value
    .replace(/\s+[–-]\s+/g, ',')
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean)

/** The values a picker shows, joined by commas, or empty while any is not whole. */
export const pickedValues = (value: string, kind: Pick<PickerKind, 'whole'>): string => {
  const held = heldValues(value)
  return held.length > 0 && held.every(kind.whole) ? held.join(',') : ''
}

/**
 * What the field shows. **Being edited, the field is the value**, so what is on
 * screen can always be read back; at rest each value is written, a range with a
 * dash and several with commas. Several show only what is typed, beside their tags.
 */
export const pickerDisplay = (
  state: {
    readonly draft: string
    readonly editing: boolean
    readonly iso: boolean
    readonly mode: PickerMode
    readonly value: string
  },
  kind: Pick<PickerKind, 'written'>,
): string => {
  const { draft, editing, iso, mode, value } = state
  if (mode === 'multiple') {
    return draft
  }
  const held = heldValues(value)
  if (editing || iso) {
    return mode === 'range' && held.length === 2 ? held.join(' – ') : value
  }
  const written = held.map(kind.written)
  return mode === 'range' ? written.join(' – ') : written.join(', ')
}

/**
 * The value a keystroke leaves: commas once every value in the text is whole,
 * and the text exactly as typed until then, so the caret does not move mid-entry.
 */
export const typedValue = (typed: string, kind: Pick<PickerKind, 'whole'>): string => {
  const held = heldValues(typed)
  return held.length > 0 && held.every(kind.whole) ? held.join(',') : typed
}

/**
 * The value a committed text reads as, where each written value in it reads
 * back and some were not whole as typed, or `undefined` where it stands as it is.
 */
export const committedValue = (
  written: readonly string[],
  kind: Pick<PickerKind, 'read' | 'whole'>,
): string | undefined => {
  const read = written.map((one) => (kind.whole(one) ? one : kind.read(one)))
  return written.length > 0 && !written.every(kind.whole) && read.every(Boolean)
    ? read.join(',')
    : undefined
}

/**
 * What a key in the text of a field of several does: Enter adds what was typed,
 * where it reads, and Backspace in an empty text takes the last one back out.
 * `undefined` where the key does nothing to the values.
 */
export const draftKey = (
  key: string,
  state: { readonly draft: string; readonly sorts: boolean; readonly value: string },
  kind: Pick<PickerKind, 'read' | 'whole'>,
): { readonly cleared: boolean; readonly value: string | undefined } | undefined => {
  const held = heldValues(state.value)
  const text = state.draft.trim()
  const draft = kind.whole(text) ? text : kind.read(text)
  if (key === 'Enter' && draft !== '') {
    const added = [...held, draft]
    return {
      cleared: true,
      value: held.includes(draft) ? undefined : (state.sorts ? added.sort() : added).join(','),
    }
  }
  if (key === 'Backspace' && state.draft === '' && held.length > 0) {
    return { cleared: false, value: held.slice(0, -1).join(',') }
  }
  return undefined
}

/** The value with one taken back out of it. */
export const withoutValue = (value: string, one: string): string =>
  heldValues(value)
    .filter((each) => each !== one)
    .join(',')

/** The values that get a tag, all of them until `limit` says not, and how many are left over. */
export const shownValues = (
  value: string,
  limit: number,
): { readonly rest: number; readonly shown: string[] } => {
  const held = heldValues(value)
  const shown = limit > 0 ? held.slice(0, limit) : held
  return { rest: Math.max(0, held.length - shown.length), shown }
}

/**
 * The answers a field holds, or `undefined` where its text is its answer: every
 * value of a range or several, or one empty answer while any is not whole.
 */
export const pickerAnswers = (
  mode: PickerMode,
  value: string,
  kind: Pick<PickerKind, 'whole'>,
): readonly string[] | undefined => {
  if (mode !== 'single') {
    const held = heldValues(value)
    return held.every(kind.whole) ? held : ['']
  }
  const text = value.trim()
  return text === '' || kind.whole(text) ? undefined : ['']
}
