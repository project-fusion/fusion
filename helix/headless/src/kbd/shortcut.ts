/**
 * The bookkeeping that writes a chord onto the control a shortcut belongs to,
 * in the words core's `ariaChord` spells it in.
 *
 * Beside the family's `index.ts`, because the attribute is a fact about
 * another element, and not the key's template.
 */

/** The space-separated list with `chord` added once. */
export const withShortcut = (list: string | null, chord: string): string => {
  const chords = (list ?? '').split(/\s+/).filter(Boolean)
  return chords.includes(chord) ? chords.join(' ') : [...chords, chord].join(' ')
}

/** The list with `chord` taken out, or `null` when nothing is left. */
export const withoutShortcut = (list: string | null, chord: string): string | null => {
  const chords = (list ?? '').split(/\s+/).filter((one) => one !== '' && one !== chord)
  return chords.length > 0 ? chords.join(' ') : null
}

/** What each control was given, so only a chord this file wrote is ever taken away. */
const WRITTEN = new WeakMap<Element, Set<string>>()

/**
 * Adds a chord to the control's `aria-keyshortcuts`, leaving any the page
 * wrote itself.
 */
export const claimShortcut = (control: Element, chord: string): void => {
  if (chord === '') {
    return
  }
  const before = control.getAttribute('aria-keyshortcuts')
  if ((before ?? '').split(/\s+/).includes(chord) && !WRITTEN.get(control)?.has(chord)) {
    return
  }
  const written = WRITTEN.get(control) ?? new Set<string>()
  written.add(chord)
  WRITTEN.set(control, written)
  control.setAttribute('aria-keyshortcuts', withShortcut(before, chord))
}

/** Takes back a chord this file wrote, and the attribute with the last one. */
export const releaseShortcut = (control: Element, chord: string): void => {
  const written = WRITTEN.get(control)
  if (!written?.delete(chord)) {
    return
  }
  const after = withoutShortcut(control.getAttribute('aria-keyshortcuts'), chord)
  if (after === null) {
    control.removeAttribute('aria-keyshortcuts')
  } else {
    control.setAttribute('aria-keyshortcuts', after)
  }
}
