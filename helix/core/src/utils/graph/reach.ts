/**
 * How far a selection reaches, which is what the drawing lights:
 *
 * - `links`, the notes the selected one links to and from, and the links
 *   that touch it.
 * - `upstream`, every note a path of links leads from to the selected one,
 *   and the links on those paths. Where a link runs from what a note was
 *   derived from to the note, this is everything the note came from.
 * - `downstream`, every note a path of links leads to from the selected one,
 *   and the links on those paths: everything that depends on it.
 */
export type GraphReach = 'downstream' | 'links' | 'upstream'

/** What a selection reaches: the notes, without the selected one, and whether a link is on the way. */
export interface Reached {
  /** Whether the link from `source` to `target` is one the selection reaches along. */
  along(source: string, target: string): boolean
  /** The notes reached, not counting the selected one. */
  near: ReadonlySet<string>
}

/** What `selected` reaches over `links`, as `reach` says. */
export const reachOf = (
  selected: string,
  links: Iterable<{ source: string; target: string }>,
  reach: GraphReach,
): Reached => {
  const list = [...links]
  if (reach === 'links') {
    const near = new Set<string>()
    for (const { source, target } of list) {
      if (source === selected) {
        near.add(target)
      } else if (target === selected) {
        near.add(source)
      }
    }
    return {
      along: (source, target) => source === selected || target === selected,
      near,
    }
  }
  /* Walked against the links for `upstream` and with them for `downstream`,
     each note once, so a graph with a cycle in it still ends. */
  const up = reach === 'upstream'
  const next = new Map<string, string[]>()
  for (const { source, target } of list) {
    const [from, to] = up ? [target, source] : [source, target]
    const out = next.get(from)
    if (out) {
      out.push(to)
    } else {
      next.set(from, [to])
    }
  }
  const reached = new Set([selected])
  const queue = [selected]
  for (let at = queue.pop(); at !== undefined; at = queue.pop()) {
    for (const to of next.get(at) ?? []) {
      if (!reached.has(to)) {
        reached.add(to)
        queue.push(to)
      }
    }
  }
  /* **A link is on the way where the end nearer the selection is reached**:
     upstream, its target leads on to the selected note, so its source does
     too; downstream, the reverse. */
  const along = up
    ? (_: string, target: string) => reached.has(target)
    : (source: string) => reached.has(source)
  reached.delete(selected)
  return { along, near: reached }
}
