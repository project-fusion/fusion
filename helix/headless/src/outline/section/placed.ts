/**
 * The Outline Sections on the page, which an outline with no links passed in
 * draws a link for. Registers nothing, so the outline and the section can
 * both import it.
 */

/** What an outline reads of a section to draw its link. */
export interface PlacedSection extends HTMLElement {
  /** The words its link says. */
  readonly label: string
  /** Its heading's level, from 1. */
  readonly level: number
}

const placed = new Set<PlacedSection>()
const watchers = new Set<() => void>()
let told = false

/* Once for every change in one task, as a page draws its sections together. */
const tell = (): void => {
  if (told) {
    return
  }
  told = true
  queueMicrotask(() => {
    told = false
    for (const watcher of [...watchers]) {
      watcher()
    }
  })
}

/** Adds a section, or says that one already placed changed its id, words, or level. */
export const placeSection = (section: PlacedSection): void => {
  placed.add(section)
  tell()
}

/** Takes a section off the page. */
export const removeSection = (section: PlacedSection): void => {
  if (placed.delete(section)) {
    tell()
  }
}

/** Calls `changed` after sections arrive, change, or leave, until stopped. */
export const watchSections = (changed: () => void): (() => void) => {
  watchers.add(changed)
  return () => {
    watchers.delete(changed)
  }
}

/**
 * The sections with an id in the tree `root` is, in the order they stand
 * in it.
 */
export const sectionsIn = (root: Node): PlacedSection[] =>
  [...placed]
    .filter((section) => section.id !== '' && section.getRootNode() === root)
    .sort((one, other) =>
      one.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )

/** The attribute on a link the outline drew for a section. */
const DRAWN = 'data-section-link'

/**
 * Draws a link in `outline` for each section on its page, where `outline`
 * holds no link of yours: `<a href="#install" data-level="2">Install</a>`,
 * styled as a link passed in is. Changes only what differs, and answers
 * whether it changed anything.
 */
export const drawSectionLinks = (outline: HTMLElement): boolean => {
  const drawn = [...outline.children].filter(
    (child): child is HTMLAnchorElement =>
      child instanceof HTMLAnchorElement && child.hasAttribute(DRAWN),
  )
  const own = [...outline.children].some(
    (child) => !child.hasAttribute(DRAWN) && child.slot !== 'heading' && child.slot !== 'indicator',
  )
  const sections = own ? [] : sectionsIn(outline.getRootNode())
  let changed = false
  sections.forEach((section, at) => {
    const href = `#${encodeURIComponent(section.id)}`
    const level = section.level > 1 ? String(section.level) : null
    let link = drawn[at]
    if (link === undefined) {
      link = document.createElement('a')
      link.setAttribute(DRAWN, '')
      outline.append(link)
      changed = true
    }
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href)
      changed = true
    }
    if (link.getAttribute('data-level') !== level) {
      if (level === null) {
        link.removeAttribute('data-level')
      } else {
        link.setAttribute('data-level', level)
      }
      changed = true
    }
    const words = section.label === '' ? section.id : section.label
    if (link.textContent !== words) {
      link.textContent = words
      changed = true
    }
  })
  for (const extra of drawn.slice(sections.length)) {
    extra.remove()
    changed = true
  }
  return changed
}
