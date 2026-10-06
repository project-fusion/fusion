/** What the marks are called in `CSS.highlights`, and in `base.css`. */
export const FILTER_MARK = 'helix-filter-match'

/**
 * The ranges each filtering owner has matched, so the union can be rebuilt
 * when any one of them changes.
 *
 * `CSS.highlights` is one registry for the whole document, keyed by name, so a
 * second list writing under the same name would erase the first one's marks.
 * Keyed by owner and rebuilt from every entry, two filtered lists on a page
 * both stay marked. A `Map` rather than a `WeakMap` because the union has to be
 * walked and a `WeakMap` cannot be, which is why an owner takes itself out on
 * disconnect.
 */
const matched = new Map<Element, Range[]>()

/**
 * Where a needle sits inside an element, as a range over its text nodes, or
 * nothing where it does not.
 *
 * Walked rather than measured off `textContent`, because the words may be split
 * across several nodes and wrapped in elements of the consumer's, and a match
 * can begin in one node and end in another. The offsets are mapped back onto
 * the nodes they came from, so the range covers the real text either way.
 * Matched without regard to case, as a filter matches.
 */
export const rangeOf = (root: Element, needle: string): Range[] => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: [Node, number][] = []
  let whole = ''
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    nodes.push([node, whole.length])
    whole += node.nodeValue
  }
  const at = whole.toLowerCase().indexOf(needle.toLowerCase())
  if (at < 0 || needle === '') {
    return []
  }
  const range = root.ownerDocument.createRange()
  const [start, before] = nodes.findLast(([, from]) => from <= at) as [Node, number]
  range.setStart(start, at - before)
  const end = at + needle.length
  const [last, under] = nodes.findLast(([, from]) => from < end) as [Node, number]
  range.setEnd(last, end - under)
  return [range]
}

/**
 * Marks where `needle` matches in each of `elements`, for `owner`, without
 * touching the elements. An empty needle takes the owner's marks away, which
 * is also what an owner leaving the page calls.
 *
 * **The Custom Highlight API paints a range, and nothing is inserted.** The
 * words are usually the consumer's own light DOM, slotted through as many as
 * two shadow roots, and wrapping the matched part in a `<mark>` would mean
 * rewriting their content: markup they wrote would come back changed. So an
 * option holding a link or an icon is marked as readily as one holding a bare
 * word. Listbox marks what its filter matched this way, and so every family
 * that filters through one: Select, Combobox, Command and Time Picker.
 *
 * **The rule that paints it lives in `base.css`**, as
 * `::highlight(helix-filter-match)`, rather than in a component's styles. A
 * highlight is styled from the tree its text lives in, and that text lives in
 * the consumer's document.
 *
 * Nothing at all where the API is missing, as on a server, in a test
 * environment or in an older browser: the text nodes are not walked for an
 * answer nothing can paint.
 */
export const markMatches = (owner: Element, elements: Iterable<Element>, needle: string): void => {
  const registry = globalThis.CSS?.highlights
  if (registry === undefined) {
    return
  }
  if (needle === '') {
    matched.delete(owner)
  } else {
    matched.set(
      owner,
      [...elements].flatMap((element) => rangeOf(element, needle)),
    )
  }
  const all = [...matched.values()].flat()
  if (all.length === 0) {
    registry.delete(FILTER_MARK)
  } else {
    registry.set(FILTER_MARK, new Highlight(...all))
  }
}
