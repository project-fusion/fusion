/**
 * What the consumer slotted, as the plain data a media element can be given.
 *
 * A media element runs resource selection over its own child nodes and a slot
 * is one node, so anything wrapping `<video>` or `<audio>` in a shadow root has
 * to copy rather than slot. The two questions that copying asks are answered
 * here: which attributes come across, and whether a fresh read differs from the
 * set already held. When to read, and what to do with the answer, stay with the
 * element.
 *
 * A read of light DOM and nothing else: no media element, no playback state,
 * nothing drawn, which is what makes it a utility rather than a controller.
 */

/** A `<source>` or `<track>` as the consumer wrote it, reduced to what the copy carries. */
export interface MediaCopy {
  attrs: Record<string, string>
  tag: 'source' | 'track'
}

/**
 * The attributes a copy carries, named per element.
 *
 * Explicit rather than a blind copy of every attribute: these are two elements
 * with a known and small surface, and copying anything a consumer happened to
 * put on one would carry their framework's own markers into a shadow root that
 * has no use for them.
 */
const CARRIED = {
  source: ['media', 'sizes', 'src', 'srcset', 'type'],
  track: ['default', 'kind', 'label', 'src', 'srclang'],
} as const

/** The copies to make of what the default slot is given. */
export const copiesOf = (elements: readonly Element[]): MediaCopy[] =>
  elements
    .filter(
      (node): node is HTMLSourceElement | HTMLTrackElement =>
        node instanceof HTMLSourceElement || node instanceof HTMLTrackElement,
    )
    .map((node) => {
      const tag = node instanceof HTMLTrackElement ? ('track' as const) : ('source' as const)
      const attrs: Record<string, string> = {}
      for (const name of CARRIED[tag]) {
        const value = node.getAttribute(name)
        if (value !== null) {
          attrs[name] = value
        }
      }
      return { attrs, tag }
    })

/**
 * Whether two reads describe the same media.
 *
 * The same set again is not a change. A video reloads for every new list, and
 * the first `slotchange` reports the children the element has already read.
 */
export const sameCopies = (one: readonly MediaCopy[], two: readonly MediaCopy[]): boolean =>
  JSON.stringify(one) === JSON.stringify(two)
