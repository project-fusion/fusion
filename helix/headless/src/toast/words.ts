import { joinSaid, toneMark } from '@fusion.dev/helix-core'

/* Joined as a phone joins them, in core. */
export { joinSaid }

/** The slots whose content is not what a message says: its controls and its marks. */
const UNSAID = new Set(['actions', 'dismiss-icon', 'icon'])

/**
 * What a message says as it arrives: the word for its tone, then its heading,
 * its description and its text, and never its actions or its dismiss control,
 * which a reader finds by moving into the message.
 */
export const messageWords = (item: Element): string => {
  const tone = (item as Element & { tone?: string }).tone ?? item.getAttribute('tone') ?? undefined
  const label = toneMark(tone)?.label
  /* The heading first, wherever it was written, since it names the message. */
  const heading: string[] = []
  const rest: string[] = []
  for (const node of item.childNodes) {
    if (node instanceof Element) {
      const slot = node.getAttribute('slot') ?? ''
      if (!UNSAID.has(slot)) {
        ;(slot === 'heading' ? heading : rest).push(node.textContent ?? '')
      }
    } else if (node.nodeType === 3) {
      rest.push(node.textContent ?? '')
    }
  }
  return joinSaid([...(label ? [label] : []), ...heading, ...rest])
}
