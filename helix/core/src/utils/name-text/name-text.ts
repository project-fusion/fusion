/**
 * The words a node gives a name computed from its content: its text, read
 * through slots, and the `aria-label` or `alt` of a picture in it, such as an
 * icon named by its own label. A node hidden from the reader gives none, and
 * so does `shown`, the part where a control shows its value.
 *
 * **In every build.** `AriaForwardController` asks it whether a control's own
 * label has words in it, which decides where the host's label goes, so it is
 * kept apart from the missing-name warning, which only a development build
 * carries.
 */
export const nameText = (node: Node, shown?: Element | null): string => {
  if (node === shown) {
    return ''
  }
  if (node instanceof HTMLSlotElement) {
    return node
      .assignedNodes({ flatten: true })
      .map((one) => nameText(one, shown))
      .join('')
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (!(node instanceof Element)) {
    return ''
  }
  if ((node instanceof HTMLElement && node.hidden) || node.getAttribute('aria-hidden') === 'true') {
    return ''
  }
  const said = node.getAttribute('aria-label') ?? node.getAttribute('alt')
  if (said?.trim()) {
    return said
  }
  return [...node.childNodes].map((one) => nameText(one, shown)).join('')
}
