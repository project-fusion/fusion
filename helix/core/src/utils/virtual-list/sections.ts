/**
 * The sections of a list given `section-field`, as arithmetic over indices.
 *
 * The controller windows **entries**: each section's header, then its items.
 * A section starts wherever the field's value changes, so the items arrive
 * grouped, as a server sorts them. Item `i` of section `s` is entry
 * `i + s + 1`, and the header of section `s` is entry `starts[s] + s`.
 */
import { valueAt } from '../row-data/row-data.js'
import { textOf } from './fields.js'

/** Where each section starts in the items, and what it is called. */
export interface Sections {
  /** The section names, in order. */
  names: string[]
  /** The index of each section's first item, in order. */
  starts: number[]
}

/** The sections `field` divides the items into. */
export const sectionsOf = (items: readonly unknown[], field: string): Sections => {
  const names: string[] = []
  const starts: number[] = []
  let last: string | undefined
  for (const [at, item] of items.entries()) {
    const name = textOf(valueAt(item, field))
    if (at === 0 || name !== last) {
      names.push(name)
      starts.push(at)
      last = name
    }
  }
  return { names, starts }
}

/** The last of `length` rising values, read by `at`, that is no more than `target`. */
const lastUpTo = (length: number, at: (index: number) => number, target: number): number => {
  let low = 0
  let high = length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (at(middle) <= target) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return low
}

/** The section item `item` is in. */
export const sectionAt = ({ starts }: Sections, item: number): number =>
  lastUpTo(starts.length, (index) => starts[index] ?? 0, item)

/** The entry item `item` is. */
export const entryOf = (sections: Sections, item: number): number =>
  item + sectionAt(sections, item) + 1

/** The entry of section `section`'s header. */
export const headOf = ({ starts }: Sections, section: number): number =>
  (starts[section] ?? 0) + section

/**
 * The items a span of entries holds: what a window of entries draws, or what
 * a reader sees. A header at either end holds no item, so the span starts at
 * its section's first item.
 */
export const itemsIn = (
  sections: Sections,
  entries: { first: number; last: number },
  count: number,
): { first: number; last: number } => {
  const item = (entry: number): number => {
    if (entry >= count + sections.starts.length) {
      return count
    }
    /* The last section whose header is at or before the entry. */
    const section = lastUpTo(sections.starts.length, (index) => headOf(sections, index), entry)
    return Math.max(sections.starts[section] ?? 0, entry - section - 1)
  }
  return { first: item(entries.first), last: Math.max(item(entries.first), item(entries.last)) }
}
