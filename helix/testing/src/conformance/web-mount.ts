import { GROUP_TAGS, PAGE_SLOTS } from './setup.js'
import type { Mounted, Updatable } from './web-left.js'

/*
 * How the web half holds a setup it built: its items and panels by value,
 * and every event each element sends, as the page hears it.
 */

/** The rows of the pages an item opens, and of the pages they open, in order. */
const pageRows = (item: Element): Updatable[] =>
  ([...item.children] as Updatable[])
    .filter((child) => PAGE_SLOTS.has(child.slot) && child.hasAttribute('value'))
    .flatMap((child) => [child, ...pageRows(child)])

/**
 * The item elements a setup mounted, in order: each child that fills no
 * region, the items in a group under a heading, and the rows of the pages
 * items open, after the item that opens them, as `itemsOf` reads them.
 */
const itemElements = (parent: Element): Updatable[] =>
  ([...parent.children] as Updatable[])
    .filter((child) => !child.slot)
    .flatMap((child) =>
      GROUP_TAGS.has(child.localName) ? itemElements(child) : [child, ...pageRows(child)],
    )

/** An event an element sent, and the value of the item that sent it, or `null` for the element. */
export interface Heard {
  readonly event: Event
  readonly from: string | null
}

/**
 * Holds a built setup: its items and panels by value, and each event each
 * of its elements sends, in order. **An event stopped on its way down to
 * the element is one the page cannot hear on it**, as a drilldown stops the
 * `select` of a row that opens a page, so it is left out.
 */
export const mountSetup = (root: Updatable): { heard: Heard[]; mounted: Mounted } => {
  const children = [...root.children] as Updatable[]
  /* An item with no value is known by its `href`, as a destination is. */
  const valued = (one: Element) => one.getAttribute('value') ?? one.getAttribute('href') ?? ''
  const items = itemElements(root)
  const mounted: Mounted = {
    items: new Map(items.map((one) => [valued(one), one])),
    panels: new Map(
      children.filter((one) => one.slot === 'panels').map((one) => [valued(one), one]),
    ),
    root,
  }
  const heard: Heard[] = []
  for (const [element, from] of [
    [root, null] as const,
    ...[...new Set([...children, ...items])].map((one) => [one, valued(one)] as const),
  ]) {
    const send = element.dispatchEvent.bind(element)
    element.dispatchEvent = (event: Event) => {
      const stop = event.stopPropagation.bind(event)
      let unheard = false
      event.stopPropagation = () => {
        unheard ||= event.eventPhase === Event.CAPTURING_PHASE
        stop()
      }
      const entry = { event, from }
      heard.push(entry)
      const result = send(event)
      if (unheard) {
        heard.splice(heard.indexOf(entry), 1)
      }
      return result
    }
  }
  return { heard, mounted }
}
