/** What `style` gives a part: its React Native style, and what it lays out and draws. */

import type { Deferred } from './deferred.js'
import type { Clip } from './effects.js'

/**
 * How a scroller snaps: whether it always comes to rest on a snap, as `mandatory`
 * says, and what it keeps clear of one, in points, as `scroll-padding` does.
 */
export interface Snap {
  readonly padding: number
  readonly strict: boolean
}

/** Where a node stands among its siblings. */
export interface Placed {
  readonly first: boolean
  /**
   * Its place counting from one at the end, which `:nth-last-child(2)`
   * reads. Unknown when absent.
   */
  readonly fromEnd?: number
  /** Its place counting from one, which `:nth-child(even)` reads. Unknown when absent. */
  readonly index?: number
  readonly last: boolean
}

/** How a part lays out what is inside it, in CSS's terms. */
export interface Layout {
  /**
   * Whether it is a flex or grid container. A box in block flow is not.
   */
  readonly flex: boolean
  /**
   * Whether its main axis runs along the line.
   */
  readonly row: boolean
  /**
   * A grid's tracks along its main axis, such as `auto` and `minmax(0, 1fr)`.
   */
  readonly tracks: readonly string[]
  /**
   * Whether a grid drawn as a row wraps its line, because content passed in
   * spans every column, as `grid-column: 1 / -1` puts a meter's label on a
   * row of its own above its bar.
   */
  readonly wraps?: boolean
}

export const BLOCK: Layout = { flex: false, row: false, tracks: [] }

/** A part's animation, resolved. */
export interface Motion {
  /**
   * How long the animation waits before its first run, in milliseconds.
   */
  readonly delay: number
  /**
   * Which way each run goes: `normal`, `reverse`, `alternate`, or
   * `alternate-reverse`.
   */
  readonly direction: string
  /**
   * How long one run takes, in milliseconds.
   */
  readonly duration: number
  /**
   * The timing function, such as `linear`.
   */
  readonly easing: string
  /**
   * Whether the first frame holds before the runs and the last after them:
   * `none`, `forwards`, `backwards`, or `both`.
   */
  readonly fill: string
  /**
   * Each frame's selector and its resolved declarations.
   */
  readonly frames: readonly (readonly [
    at: string,
    declarations: Readonly<Record<string, Resolution>>,
  ])[]
  /**
   * How many runs, `Infinity` for `infinite`.
   */
  readonly iterations: number
  /**
   * Each frame as the style a view takes, by its selector, such as `0%, 100%`.
   */
  readonly keyframes: Readonly<Record<string, Style>>
  /**
   * The keyframes' name.
   */
  readonly name: string
  /**
   * Whether `animation-play-state` holds it still.
   */
  readonly paused: boolean
  /**
   * How many times the part's machine has started the motion again, as a
   * drilldown's page slides in anew with each move. A new count runs it
   * from its start.
   */
  readonly run?: number
}

/** How a style property moves to a new value. */
export interface Transition {
  /**
   * How long the move waits before it starts, in milliseconds. None when
   * absent.
   */
  readonly delay?: number
  /**
   * How long the move takes, in milliseconds.
   */
  readonly duration: number
  /**
   * The timing function, such as `cubic-bezier(0.3, 0, 0, 1.2)`.
   */
  readonly easing: string
}

/** A line drawn along one edge of a part, from a one-color gradient sized to it. */
export interface Line {
  readonly color: string
  readonly edge: 'bottom' | 'left' | 'right' | 'top'
  /** How far in from the edge the line stands, 0 where it is unset. */
  readonly inset?: number
  readonly thickness: number
}

/** A style, as React Native takes it. */
export type Style = Readonly<Record<string, number | string>>

/**
 * What a region gives the content passed into it. **Its text style is what
 * the content inherits**, and the rest the box the region is drawn in, as a
 * `slot` that is given a box on the web.
 */
export interface Content {
  /**
   * What each child passed in takes, by its tag, `*` for any.
   */
  readonly children: Readonly<Record<string, Slotted>>
  /**
   * Custom properties the region sets, by name after `--`, which what is
   * passed in inherits.
   */
  readonly custom: Readonly<Record<string, Resolution>>
  /**
   * The region's own style.
   */
  readonly style: Style
}

/** What the host gives the children of one tag. */
export interface Slotted {
  /**
   * What the child does to the counters, in CSS's order: reset, increment,
   * then set.
   */
  readonly counting: Counting
  /**
   * Custom properties set on the child, by name after `--`, which it reads
   * as its hooks.
   */
  readonly custom: Readonly<Record<string, Resolution>>
  /**
   * The declarations that read the child's own private values, which the
   * child resolves over its host style, as CSS resolves a `var()` on the
   * element a declaration lands on.
   */
  readonly deferred?: Deferred
  /**
   * The marker drawn before the child, as `display: list-item` draws one.
   */
  readonly marker?: string
  /**
   * Where the child goes in a grid the native grid lays out, as
   * `grid-column` and `grid-row` write it.
   */
  readonly placement?: Placing
  /**
   * The style over the child's own host style.
   */
  readonly style: Style
  /**
   * How the style moves, by its React Native name, as a speed dial's actions
   * arrive. None under reduced motion.
   */
  readonly transitions?: Readonly<Record<string, Transition>>
  /**
   * Private values set on the child itself.
   */
  readonly values: Readonly<Record<string, Resolution>>
}

/**
 * A box a `::before` or `::after` draws: its style, and its words where its
 * `content` says some.
 */
export interface GeneratedBox {
  readonly motion?: Motion
  readonly style: Style
  readonly transitions: Readonly<Record<string, Transition>>
  /**
   * Whether a screen reader skips the words, as a quotation mark whose `alt`
   * is empty is drawn and not read.
   */
  readonly unread?: boolean
  readonly words?: string
}

/**
 * The boxes a part's `::before` and `::after` draw. **A `::before` with words
 * draws them as `before`**, ahead of what the part holds, as a rail draws its
 * number, and one with empty `content` draws a box, as a radio's dot.
 */
export interface Generated {
  readonly after?: GeneratedBox
  readonly before?: GeneratedBox
}

/** What an element does to the counters, each a counter's name and amount. */
export interface Counting {
  readonly increment: Readonly<Record<string, number>>
  readonly reset: Readonly<Record<string, number>>
  readonly set: Readonly<Record<string, number>>
}

/** Where a cell goes in a grid, as `grid-column` and `grid-row` write it. */
export interface Placing {
  readonly column?: string
  readonly row?: string
}

/**
 * What the native grid lays a part's content out by: the track lists, the
 * gaps in points, and how each cell aligns in its row and in its column.
 */
export interface GridForm {
  readonly alignItems?: string
  readonly columnGap: number
  readonly columns: string
  readonly justifyItems?: string
  readonly rowGap: number
  readonly rows?: string
}

/** A part's React Native style, and what had no native meaning. */
export interface Resolved {
  /**
   * The scrim a layer's `::backdrop` rules draw, which the layer host lays
   * under the layer, where its rules draw one.
   */
  readonly backdrop?: GeneratedBox
  /** The radius of the blur behind what the part holds, in points, where `backdrop-filter` draws one. */
  readonly blur?: number
  /**
   * The look of the words a field shows while it is empty, where its
   * `::placeholder` rules give one: a `TextInput` draws their color.
   */
  readonly placeholder?: Style
  /** The inset the part is clipped by, where `clip-path: inset()` draws one. */
  readonly clip?: Clip
  /**
   * Words the part's `::before` draws ahead of what it holds.
   */
  readonly before?: string
  /**
   * Whether the part is an inline box, `display: inline`, which a phone draws
   * as a `Text` nested in the words around it.
   */
  readonly inline?: boolean
  /**
   * Whether the part's `::before` opens a quotation, `open-quote` or
   * `no-open-quote`, so a quotation inside it takes the inner marks.
   */
  readonly opens?: boolean
  /**
   * What the part does to the counters.
   */
  readonly counting: Counting
  /**
   * What the host gives its children, by their tag, from its `::slotted()`
   * rules. Empty for a part.
   */
  readonly children: Readonly<Record<string, Slotted>>
  /**
   * What each region gives the content passed into it, by the region's name,
   * from the rules `on` a region. Empty for a part.
   */
  readonly contents: Readonly<Record<string, Content>>
  /**
   * The custom properties at the part, by name after `--`: the host's, then
   * what the element around sets on it, then each part's down to this one.
   * The elements passed into a region inside the part read them, as custom
   * properties inherit on the web.
   */
  readonly custom: Readonly<Record<string, Resolution>>
  /**
   * The properties and values that were left out, as `property: reason`.
   */
  readonly dropped: readonly string[]
  /**
   * How much of its content the part shows, `0` or `1`, where its one row is
   * a `fit()`: a phone draws it at its content's measured height, or none.
   */
  readonly fit?: 0 | 1
  /**
   * Whether the part is `visibility: hidden`: drawn unseen, and, as on the
   * web, out of what a screen reader reaches and what a press lands on.
   */
  readonly invisible?: true
  /**
   * What a part that is `visibility: hidden` draws with while its
   * `visibility` transition runs: seen, at its own opacity, and pressable.
   */
  readonly shown?: Style
  /**
   * The boxes the part's `::before` and `::after` draw, where each draws one.
   */
  readonly generated?: Generated
  /**
   * The part's animation, where it has one.
   */
  readonly motion?: Motion
  /**
   * What the native grid lays the part's content out by, where the part is
   * a grid of more than one column whose only content is one region, as
   * Grid's host is. The part's own view is then a column, and the grid is
   * drawn inside it.
   */
  readonly grid?: GridForm
  /**
   * How the part lays out what it holds, which its region content is laid
   * out within.
   */
  readonly layout: Layout
  /**
   * The style for the regions the part holds, from its `> slot` rules.
   */
  readonly regions: Style
  /**
   * A line along one edge, where a background draws one.
   */
  readonly rule?: Line
  /**
   * The color scheme the elements passed into the part draw in, as
   * `color-scheme` sets it on the web: a QR code's logo plate is paper, so
   * the mark on it draws in the light scheme.
   */
  readonly scheme?: 'dark' | 'light'
  /**
   * The style to pass to the part's view. A `translate` is written as
   * `translateX` and `translateY`, which the view moves by.
   */
  readonly style: Style
  /**
   * How each style property moves, by its React Native name.
   */
  readonly transitions: Readonly<Record<string, Transition>>
  /**
   * The axis the part scrolls along, or both, where its content may be longer than
   * it is.
   */
  readonly scrolls?: 'both' | 'x' | 'y'
  /** How the part snaps what scrolls in it, as its `scroll-snap-type` says. */
  readonly snap?: Snap
  /** Where the part comes to rest in a scroller that snaps, as its `scroll-snap-align` says. */
  readonly snapAlign?: 'center' | 'end' | 'start'
  /**
   * Whether the part is as wide as its content along its parent's row: it
   * neither grows nor sets a width or a basis, so its width is its content's
   * and it yields only where the row runs out of room, as a flex item with an
   * automatic basis does on the web.
   */
  readonly hugs?: true
  /**
   * Whether the part takes an equal share of its row and is never narrower
   * than its content, as a `minmax(max-content, 1fr)` track is: App Header's
   * brand and actions, which center the navigation between them.
   */
  readonly shares?: true
  /**
   * The private values the part's content inherits.
   */
  readonly values: Readonly<Record<string, Resolution>>
}

export type Resolution = number | string | readonly Resolution[] | undefined
