import { toneMark } from '@fusion.dev/helix-core'

/** The slots whose content is not what a message says: its controls and its marks. */
const UNSAID = new Set(['actions', 'dismiss-icon', 'icon'])

/**
 * Pieces of a message joined into one line a screen reader says, with a full
 * stop between two where the first does not already end a sentence, so a
 * heading and its detail are heard as two sentences and not run together.
 */
export const joinSaid = (pieces: readonly string[]): string =>
  pieces
    .map((piece) => piece.replace(/\s+/gu, ' ').trim())
    .filter((piece) => piece !== '')
    .reduce(
      (line, piece) =>
        line === '' ? piece : `${line}${/[.!?:;]$/u.test(line) ? '' : '.'} ${piece}`,
      '',
    )

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
