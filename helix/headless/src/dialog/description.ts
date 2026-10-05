/** What counts as a control when reading a body for its words. */
const CONTROL =
  'a[href], audio[controls], button, details, form, iframe, input, select, textarea, video[controls], [contenteditable], [tabindex]'

/**
 * Whether an element is a control.
 *
 * A custom element counts until it has upgraded, since this cannot see what it
 * draws before then. Once it has, it counts where it takes focus, joins a form,
 * or draws a control in its own shadow root, so a text or a callout at the top
 * of a body describes the dialog as a paragraph does.
 */
const isControl = (element: Element): boolean => {
  if (element.matches(CONTROL)) {
    return true
  }
  if (!element.localName.includes('-')) {
    return false
  }
  const definition = customElements.get(element.localName) as
    | (CustomElementConstructor & { formAssociated?: boolean })
    | undefined
  const root = element.shadowRoot
  return (
    definition === undefined ||
    !(element instanceof definition) ||
    definition.formAssociated === true ||
    root?.delegatesFocus === true ||
    root?.querySelector(CONTROL) != null
  )
}

/**
 * The elements at the start of a slot that hold words and no control, up to the
 * first one that is or holds a control.
 *
 * What a dialog is described by. A question above a form describes the dialog,
 * and the form does not: a description that read out every field label would
 * repeat what a reader hears again as they reach each field.
 */
export const wordsIn = (slot: HTMLSlotElement | null): Element[] => {
  const words: Element[] = []
  for (const one of slot?.assignedElements({ flatten: true }) ?? []) {
    if (isControl(one) || [...one.querySelectorAll('*')].some(isControl)) {
      break
    }
    if ((one.textContent ?? '').trim() !== '') {
      words.push(one)
    }
  }
  return words
}
