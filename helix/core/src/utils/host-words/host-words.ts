import { elementById } from '../element-by-id/element-by-id.js'
import { nameText } from '../name-text/name-text.js'

/** The words of each element, as a name reads them, joined with one space. */
const wordsOf = (named: readonly (Element | null)[]): string =>
  named
    .map((one) => (one ? nameText(one).replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .join(' ')

/**
 * The words that name a host, for a part inside its shadow root that must
 * carry the same name: the list a Select or a Time Picker opens.
 *
 * **Words rather than a reference**, because the part is inside the host's
 * shadow root, and neither an IDREF on the page nor the host's labels reach
 * it. Read in the order a browser names the host: its `aria-labelledby`, its
 * `aria-label`, then `own`, the name the component draws itself (its `label`),
 * then a `<label>` for it. Each element's words are read as a name reads
 * them, so hidden text is left out and runs of white space are one space.
 *
 * Empty where nothing names the host, which leaves the fallback to the caller.
 */
export const hostWords = (host: HTMLElement & { labels?: NodeList | null }, own = ''): string => {
  const ids = (host.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
  return (
    wordsOf(ids.map((id) => elementById(host, id))) ||
    host.getAttribute('aria-label')?.trim() ||
    own ||
    wordsOf([...(host.labels ?? [])] as Element[])
  )
}
