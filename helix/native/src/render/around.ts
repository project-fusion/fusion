/*
 * What region content inherits from the part around it, as a slotted element
 * inherits through the flat tree on the web: the context a region provides
 * and the hooks an element reads it with. `regions.tsx` draws the regions
 * that provide it.
 */
import { createContext, useContext } from 'react'
import type { Layout, Placed, Resolution, Slotted, Style } from '../style/resolved'
import type { Tracks } from './tracks'

/** What region content inherits from the part around it. */
export interface Around {
  /** What the host gives each child, by the child's tag, from its `::slotted()` rules. */
  readonly children: Readonly<Record<string, Slotted>>
  /**
   * The counters at this child, after it has counted, as the element around
   * ran them.
   */
  readonly counters?: Readonly<Record<string, number>>
  /**
   * The custom properties the part around and the region set, by name after
   * `--`, which the child reads as hooks and token overrides, as custom
   * properties inherit through the flat tree on the web.
   */
  readonly custom?: Readonly<Record<string, Resolution>>
  /**
   * The language the child's words are in, as `lang` inherits on the web:
   * the nearest `lang` around it, or the reader's.
   */
  readonly locale?: string
  /**
   * The style the element around gives each of this element's parts, by the
   * part's own name, where a box of the element around draws this one and
   * its rules style a part it exports, as `[part="select-all"]::part(box)`
   * does on the web. Absent for content passed into a region.
   */
  readonly parts?: Readonly<Record<string, Style>>
  /**
   * Where the child stands among the elements passed in with it, which its
   * own `:host(:first-child)` rules read.
   */
  readonly place?: Placed
  /**
   * Where the child stands among the elements of its own kind passed in with
   * it, counting from one, which its own `:host(:nth-of-type(n))` rules read.
   */
  readonly ofType?: number
  /**
   * How many quotations the child is inside, which draws a quotation's inner
   * marks, as CSS counts the depth across elements on the web.
   */
  readonly quoted?: number
  /**
   * How the child is sized where it grows in a line that scrolls across, as
   * a tab at `width="full"` does. Absent anywhere else.
   */
  readonly grown?: Grown
  /**
   * The text style content passed into a region inherits, as CSS inheritance
   * gives a slotted element on the web.
   */
  readonly text?: Style
  /**
   * The tracks the element around shares among what it holds, which the
   * child lines its parts up in where it is a subgrid.
   */
  readonly tracks?: Tracks
  /** The private values the part around gives what it holds. */
  readonly values: Readonly<Record<string, Resolution>>
  /** How the part around lays out what it holds. */
  readonly within: Layout
}

/** How a child that grows in a line that scrolls across is sized. */
export interface Grown {
  /** Its own width, measured, which it grows from. Absent while it is measured. */
  readonly least?: number
  /** Tells the line its own width while it is measured. */
  readonly report?: (width: number) => void
}

export const AroundContext = createContext<Around | undefined>(undefined)

/**
 * What the region an element is drawn in gives it, or nothing outside one.
 * **Region content inherits the private values of the part around it**, as a
 * slotted element inherits custom properties through the flat tree.
 */
export const useAround = (): Around | undefined => useContext(AroundContext)

/**
 * The text style content passed into a region inherits, its color, font, and
 * size, as CSS inheritance gives a slotted element on the web. An icon passed
 * into a row reads its color from it. Outside a region it is empty.
 *
 * **Its sizes are already scaled to the reader's text size**, so a `Text` that
 * takes them sets `allowFontScaling={false}`.
 */
export const useInheritedText = (): Style => useContext(AroundContext)?.text ?? {}
