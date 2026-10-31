import type { Setup } from './format.js'

/*
 * What the harnesses read of a setup: its items, its panels, and the
 * sections of a page an outline links to, with the layout both halves give
 * those sections.
 */

/**
 * The regions that hold an item's own rows, as a drilldown row's `page` and
 * a menu row's `submenu` hold the rows of the page they open, and a tree
 * item's `children` the items under it.
 */
export const PAGE_SLOTS: ReadonlySet<string> = new Set(['children', 'page', 'submenu'])

/** The elements that group items under a heading, whose items are the set's own. */
export const GROUP_TAGS: ReadonlySet<string> = new Set([
  'helix-megamenu-group',
  'helix-menu-section',
])

/**
 * What an element of a setup is known by: its `value`, or its `href` where
 * it has none, as a navigation's destination stands for its `href`.
 */
export const knownBy = (setup: Setup): string | undefined => {
  const value = setup.props?.value ?? setup.props?.href
  return typeof value === 'string' ? value : undefined
}

/**
 * The value of each item a setup holds, with its words, in order: each
 * child that is no region's, the items in a group under a heading, and the
 * rows of the pages items open, after the item that opens them.
 */
export const itemsOf = (setup: Setup): { readonly value: string; readonly words: string }[] =>
  (setup.children ?? []).flatMap((child) => {
    if (typeof child === 'string') {
      return []
    }
    if (child.slot !== undefined && !PAGE_SLOTS.has(child.slot)) {
      return []
    }
    if (GROUP_TAGS.has(child.tag)) {
      return itemsOf(child)
    }
    const value = knownBy(child)
    const words = (child.children ?? []).filter((one) => typeof one === 'string').join(' ')
    return typeof value === 'string' ? [{ value, words }, ...itemsOf(child)] : []
  })

/** The value of each panel a setup holds in its `panels` region, with its words. */
export const panelsOf = (setup: Setup): { readonly value: string; readonly words: string }[] =>
  (setup.children ?? []).flatMap((child) =>
    typeof child === 'string' || child.slot !== 'panels'
      ? []
      : [
          {
            value: String(child.props?.value ?? ''),
            words: (child.children ?? []).filter((one) => typeof one === 'string').join(' '),
          },
        ],
  )

/** The tag of a section of the page an outline links to. */
export const SECTION_TAG = 'helix-outline-section'

/**
 * The layout both halves give a setup that holds sections, which neither
 * lays out alike on its own: the box they scroll in is `frame` tall, and
 * each section `section` tall, one below the other from its top. The web
 * sets these lengths in a stylesheet, and a phone's measure reads them.
 */
export const SECTION_LAYOUT = { frame: 300, section: 200 } as const

/** The sections a setup holds, each with its id and the words its link says. */
export const sectionsOf = (setup: Setup): { readonly id: string; readonly label: string }[] =>
  (setup.children ?? []).flatMap((child) =>
    typeof child === 'string' || child.tag !== SECTION_TAG
      ? []
      : [
          {
            id: String(child.props?.anchor ?? ''),
            label: String(child.props?.label ?? child.props?.anchor ?? ''),
          },
        ],
  )
