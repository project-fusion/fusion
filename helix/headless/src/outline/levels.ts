/**
 * The levels of a flat run of links, as the nested lists they describe.
 *
 * A contents list written flat, `<a data-level="2">`, says its depth in an
 * attribute that only a stylesheet reads. The outline turns the run into lists
 * inside list items in its shadow root, so a screen reader hears the levels a
 * nested `<ul>` would have given it, with the links left where they are.
 */

/** One link in the tree: its place in the run, and the links nested under it. */
export interface Branch {
  /** The link's position in the flat run, counted from zero. */
  index: number
  /** The links one level or more deeper that follow it, before the next at its level. */
  children: Branch[]
}

/**
 * The level a link's `data-level` asks for, a whole number from 1.
 *
 * Absent, empty, or not a number is the top level, which is how the outline
 * has always read a link without one.
 */
export const levelOf = (value: string | null): number => {
  const level = Number.parseInt(value ?? '', 10)
  return Number.isFinite(level) && level >= 1 ? level : 1
}

/**
 * Nests a run of levels.
 *
 * Each link goes under the nearest link before it with a lower level, and to
 * the top where there is none. A jump of two levels nests one list deeper and
 * not two, since a list item with no link of its own would be read as an empty
 * entry. A run that starts deeper than 1 starts at the top all the same.
 */
export const nest = (levels: readonly number[]): Branch[] => {
  const top: Branch[] = []
  const open: { branch: Branch; level: number }[] = []
  levels.forEach((level, index) => {
    const branch: Branch = { children: [], index }
    while (open.length > 0 && (open.at(-1)?.level ?? 0) >= level) {
      open.pop()
    }
    const parent = open.at(-1)
    if (parent) {
      parent.branch.children.push(branch)
    } else {
      top.push(branch)
    }
    open.push({ branch, level })
  })
  return top
}
