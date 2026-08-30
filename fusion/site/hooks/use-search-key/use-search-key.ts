import type { RefObject } from 'react'

/**
 * The element a keypress would actually reach, through any shadow root.
 *
 * `document.activeElement` stops at the host of a shadow tree, so an input
 * inside one reports as the custom element rather than as a field. Every Helix
 * control is exactly that shape, so the shallow answer would say "not typing"
 * while somebody types.
 */
const deepActive = (): Element | null => {
  let at: Element | null = document.activeElement
  while (at?.shadowRoot?.activeElement) {
    at = at.shadowRoot.activeElement
  }
  return at
}

/** Whether that element takes text, and so has a prior claim on the key. */
const editing = (at: Element | null): boolean =>
  at instanceof HTMLElement &&
  (at.isContentEditable ||
    at instanceof HTMLInputElement ||
    at instanceof HTMLTextAreaElement ||
    at instanceof HTMLSelectElement)

/**
 * Focuses a search field when its advertised key is pressed, unless the reader
 * is already typing somewhere.
 *
 * **Refusal is the mechanism, not a workaround.** `Kbd` announces the chord
 * before consuming it and says so: "the key goes on to whatever would have had
 * it wherever this is prevented". A bare `/` bound at document scope would
 * otherwise take the slash out of every field on the page, this search and the
 * command palette's included. Calling `preventDefault` here hands the key back,
 * so the character is typed exactly as it would have been.
 *
 * **Why a shortcut rather than `autofocus`.** Autofocus moves a screen reader
 * past the heading and into an empty box on arrival, which on a page whose hero
 * carries the one line explaining what the page is costs more than the keystroke
 * it saves. A key that is offered and not taken costs nothing, and `Kbd` binds
 * only what it renders, so the shortcut exists exactly when it is visible.
 */
export const useSearchKey =
  (field: RefObject<{ focus: () => void } | null>) =>
  (event: Event): void => {
    if (editing(deepActive())) {
      event.preventDefault()
      return
    }
    field.current?.focus()
  }
