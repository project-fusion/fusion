/**
 * How an element reads where a page scrolls: a part of its own that
 * scrolls, and the sections of the page it follows. Read as syntax, as
 * `tree.ts` says.
 */

/**
 * A part that scrolls, the states the element is in as it stands, and the
 * events it sends as it moves and comes to rest, as a scroll area is in
 * `more-block-end` while there is more past its bottom edge.
 *
 * **It reads the scroll capability's `observe`**, which tells where the part
 * stands at each end of each axis on both platforms. The web element works
 * its states out itself, and a phone's runtime sets them from what the
 * capability tells. Each edge is named in logical terms: `blockStart` is
 * the top, and `inline-start` the edge a line of words starts from.
 */
export interface Scroll {
  /** The state that holds while there is more past the bottom edge. */
  readonly blockEnd?: string
  /** The state that holds while there is more before the top edge. */
  readonly blockStart?: string
  /** The state that holds while there is more past the edge a line ends at. */
  readonly inlineEnd?: string
  /** The state that holds while there is more before the edge a line starts from. */
  readonly inlineStart?: string
  /** The event sent each time the part moves, as the web's `scroll`. */
  readonly onScroll?: string
  /**
   * The state that holds while what the part holds is longer than the part
   * along an axis it scrolls.
   */
  readonly overflows?: string
  /** The part that scrolls. */
  readonly part: string
  /** The event sent once the part comes to rest, as the web's `scrollend`. */
  readonly onScrollEnd?: string
}

/**
 * The sections of the page the element follows as it scrolls, as an
 * outline marks the link of the section being read.
 *
 * **A phone has no document to find a section in by its id**, so each
 * section registers its view with `useSection`, under its id, its words and
 * its level, and the runtime gives the element the list as the value `list`
 * names: each entry's `id`, `href`, `label`, `level`, `depth`, and
 * `current`, which is `location` while the section is marked. The web
 * element reads its links and finds each section by the fragment its link
 * names.
 */
export interface Sections {
  /** The prop that says how a press on a link scrolls: `smooth`, `instant`, or `auto`. */
  readonly scrollBehavior?: string
  /** The event sent as the section being read changes, with its id as `value`. */
  readonly onChange?: string
  /**
   * The prop that says whether the element keeps the marked link in view in
   * a box of its own that scrolls.
   */
  readonly follow?: string
  /** The part the element draws for each section, which `follow` keeps in view. */
  readonly link?: string
  /**
   * The part that travels to the link of the section being read, placed
   * against the box that holds it, as the web's moving mark is.
   */
  readonly indicator?: string
  /** The value the element computes that holds the sections, which a repeat's `each` binds. */
  readonly list: string
  /** The prop that says which sections are marked: `reading` or `visible`. */
  readonly marks?: string
  /**
   * The prop that holds how far below the top of what the sections scroll
   * in a heading counts as reached, in pixels or points.
   */
  readonly offset?: string
}

/**
 * The section of the page an element is, which an outline draws a link for.
 *
 * **The web finds the element by its id**, as it finds any anchor, and a
 * phone registers the element's view under the id, as `useSection` does, so
 * code shared between the two marks a section with one element.
 */
export interface Section {
  /** The prop that holds the section's id, which a link's fragment names. */
  readonly id: string
  /** The prop that holds the words its link says. */
  readonly label?: string
  /** The prop that holds its heading's level, from 1. */
  readonly level?: string
}
