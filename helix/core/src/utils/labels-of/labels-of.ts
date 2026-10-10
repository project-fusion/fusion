/**
 * The `<label>` elements that name an element, in tree order: the `labels` of
 * a native control or of a form-associated host, as an array.
 *
 * **Read only where a label could name the element.** A `<label for>` names an
 * element by its `id`, and a `<label>` without `for` names the first control
 * inside it, both within the element's own tree. So an element with no `id`
 * and no `<label>` around it has no labels, and its list is never made.
 *
 * **Reading `labels` costs every later change to the page.** The browser makes
 * a live list, the element keeps it for as long as it lives, and the document
 * updates every such list whenever any element gains or loses a child,
 * a detached fragment included. Measured in Chromium on October 10, 2026: once
 * 1,000 buttons had been asked for their labels, cloning a template of three
 * elements took 16 µs, against 0.6 µs before. A page of 1,000 Helix buttons
 * spent 35 ms of its 123 ms first frame cloning templates for that reason.
 *
 * A server's element shim has no `closest`, and its labels are read as
 * before.
 */
export const labelsOf = (element: Element & { labels?: NodeList | null }): HTMLElement[] => {
  if (
    element.id === '' &&
    typeof element.closest === 'function' &&
    element.closest('label') === null
  ) {
    return []
  }
  return [...(element.labels ?? [])] as HTMLElement[]
}
