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
