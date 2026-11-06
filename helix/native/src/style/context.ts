/** What a part is drawn under, which `style` reads. */
import type { Deferred } from './deferred.js'
import type { Layout, Placed, Resolution } from './resolved.js'

/** The window a layer is placed in, in points. */
export interface Viewport {
  /** Its height, less the software keyboard where layers keep above it: `dvh`. */
  readonly height: number
  /**
   * The safe area at each edge, in points, which `env(safe-area-inset-*)`
   * reads: none at the bottom while the software keyboard covers it. None
   * at each edge where it is not given.
   */
  readonly insets?: {
    readonly bottom: number
    readonly left: number
    readonly right: number
    readonly top: number
  }
  /** Its whole height, the keyboard or not: `vh`, `svh`, and `lvh`. */
  readonly tall: number
  readonly width: number
}

/** What a part is being drawn under. */
export interface Context {
  /**
   * What holds now: props such as `tone` and `disabled`, custom states such as
   * `pending`, and interactions on the part such as `hover` and
   * `focusVisible`.
   */
  readonly conditions: Readonly<Record<string, boolean | string | undefined>>
  /**
   * The text color the part inherits, which `currentColor` means. The theme's
   * foreground when absent.
   */
  readonly currentColor?: string
  /**
   * Where a child the host styles stands among its siblings, which a
   * `::slotted(:first-child)` rule reads, or where the part being drawn
   * stands among the parts beside it, which `[part="line"]:first-child`
   * reads.
   */
  readonly child?: 'first' | 'later'
  /**
   * That child's or that part's place counting from one, which
   * `:nth-child(even)` reads. Unknown when absent.
   */
  readonly index?: number
  /**
   * That child's or that part's place counting from one at the end, which
   * `:nth-last-child(2)` reads. Unknown when absent.
   */
  readonly fromEnd?: number
  /**
   * The parts the element's tree draws now, which a rule's `holds: { part:
   * true }` reads. None when absent.
   */
  readonly drawn?: readonly string[]
  /**
   * Whether that child is the last of its siblings, which a
   * `::slotted(:last-child)` rule reads. Not last when absent.
   */
  readonly last?: boolean
  /**
   * Custom properties the element around sets on this one, by their whole
   * name after `--`, such as `button-radius-end-end`, which a hook of another
   * family's and a token the element around overrides read.
   */
  readonly custom?: Readonly<Record<string, number | string>>
  /**
   * Where the element stands among the content passed in with it, which a
   * `:host(:first-child)` rule reads. Nowhere when absent.
   */
  readonly place?: Placed
  /**
   * Where the element stands among the elements of its own kind passed in
   * with it, counting from one, which a `:host(:nth-of-type(n))` rule reads.
   */
  readonly ofType?: number
  /**
   * The values of the counters at the element, by name, which `counter()`
   * reads.
   */
  readonly counters?: Readonly<Record<string, number>>
  /**
   * Whether the element is at its first render, which a rule under
   * `entering` reads, as `@starting-style` on the web. Not when absent.
   */
  readonly entering?: boolean
  /**
   * The regions that hold something, by name, which a rule under `filled`
   * reads. None when absent.
   */
  readonly filled?: readonly string[]
  /**
   * The text direction. `ltr` when absent.
   */
  readonly dir?: 'ltr' | 'rtl'
  /**
   * The font size the part inherits, in points, which an em means where the
   * part sets no font size of its own, as the page's size is on the web. A
   * rem's when absent.
   */
  readonly fontSize?: number
  /**
   * Hooks set from outside, by name after the family's prefix.
   */
  readonly hooks?: Readonly<Record<string, number | string>>
  /**
   * The parts a wrap draws around what is passed into a region, which a
   * region rule's `within` reads, as a card's header row is drawn around its
   * header while its actions hold something:
   * `[part="header-row"] slot[name="header"]::slotted(*)`. None when absent.
   */
  readonly inside?: readonly string[]
  /**
   * Private values from the element around this one, by name, which a value
   * of its own overrides, as a custom property inherits.
   */
  readonly inherited?: Readonly<Record<string, Resolution>>
  /**
   * The line height the part inherits, in points, which an `lh` is where no
   * part from the host down to it sets one. 1.2 ems when absent, which is
   * `normal` in most fonts.
   */
  readonly lineHeight?: number
  /**
   * The reader's locale, such as `de-DE`, whose quotation marks a `quote()`
   * draws. English's marks when absent.
   */
  readonly locale?: string
  /**
   * Lengths the family measures as it lays out, such as where the selected tab
   * sits, by name.
   */
  readonly measured?: Readonly<Record<string, number | string>>
  /**
   * The state of the part being drawn, such as `hidden` or `data-placed`, and
   * the values a binding gives it, such as the name of a row's grip.
   */
  readonly part?: Readonly<Record<string, boolean | string>>
  /**
   * The element's props by name, numbers too, which a `derived()` value
   * computes from. `conditions` when absent.
   */
  readonly props?: Readonly<Record<string, unknown>>
  /**
   * The parts the drawn part is as well, as a row is `row-current` while it
   * is current.
   */
  readonly also?: readonly string[]
  /**
   * The style the element around gives the host, as a `::slotted()` rule
   * does, such as `flex: 1` on each tab of a full-width set.
   */
  readonly given?: Readonly<Record<string, number | string>>
  /**
   * What the element around gives the host that reads the host's own
   * private values, which the host resolves over its own rules.
   */
  readonly deferred?: Deferred
  /**
   * How many quotations the part is inside, which draws a quotation's inner
   * pair of marks from 1. 0 when absent.
   */
  readonly quoted?: number
  /**
   * Whether the system asks for reduced motion.
   */
  readonly reducedMotion?: boolean
  /**
   * The size a `rem` resolves to in a font size, a line height, and a letter
   * spacing. 16 when absent.
   */
  readonly rem?: number
  /**
   * The theme's mode, which picks a `scheme()` value. `light` when absent.
   */
  readonly scheme?: 'dark' | 'light'
  /**
   * The size a `rem` resolves to in every other length, such as a padding, a
   * gap, a corner radius, or a height. `rem` when absent.
   *
   * **Text grows with the reader's text size, and space stops at the largest
   * standard size.** The theme gives a `rem` that follows the whole text size
   * and this one, which stops at `SPACE_SCALE_LIMIT`, so a length resolves by
   * the property it sets.
   */
  readonly spaceRem?: number
  /**
   * The active theme's resolved token values, by name after `--helix-`.
   */
  readonly tokens: Readonly<Record<string, number | string>>
  /**
   * How the part around the host lays out what it holds. Block flow when
   * absent.
   */
  readonly within?: Layout
  /**
   * The window a layer is placed in, in points: its width, which a rule's
   * `window` reads, and its height less the software keyboard where
   * `HelixRoot` keeps layers above it, which a viewport length resolves
   * against. Absent outside a layer, where no rule reads the window.
   */
  readonly viewport?: Viewport
  /** The most the host can measure until it is laid out, which is the window's width. */
  readonly widest?: number
  /**
   * The host's own laid-out width, in points, which a width condition reads.
   * No width condition holds before the host is laid out.
   */
  readonly width?: number
  /**
   * How wide the font's `0` is, as a share of its size, as the measure
   * capability reports it. A `ch` is that share of an em. 0.5 when absent,
   * as CSS takes it where it cannot measure.
   */
  readonly zero?: number
}
