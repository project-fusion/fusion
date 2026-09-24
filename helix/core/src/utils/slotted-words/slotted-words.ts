/**
 * The words a host's children say in the named slots, `''` being the default
 * one, in the order they are written.
 *
 * For a component that says what the page put in it, which is the page's own
 * text and not anything this library wrote: an empty state's heading and
 * message, a banner's message. Text nodes count toward the default slot, as
 * they are assigned to it. Nothing on a server, whose element has no children
 * to read.
 */
export const slottedWords = (host: Element, slots: readonly string[]): string =>
  [...(host.childNodes ?? [])]
    .filter((node) => (node instanceof Element ? slots.includes(node.slot) : slots.includes('')))
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join(' ')
