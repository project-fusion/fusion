/**
 * The colors a themed map is drawn from, each a `#hex`, `rgb()` or `rgba()`.
 *
 * **A handful, and the rest is mixed from them.** Buildings, borders, labels
 * and the smaller roads are the land moved toward the ink by different
 * amounts, so a light theme draws dark lines on a light ground and a dark
 * theme light lines on a dark one, with no second palette to keep in step.
 * The roads a reader navigates by take the brand, which is where a map shows
 * whose it is.
 */
export interface MapColors {
  /** The ink, which roads, borders and labels are mixed toward: `foreground`. */
  foreground: string
  /** The water's hue, mixed quietly into the land: `info`. */
  info: string
  /** The brand, which the motorways and the major roads are drawn toward: `primary`. */
  primary: string
  /** The parks' and woods' hue, mixed more quietly still: `success`. */
  success: string
  /** The land, which everything else is drawn on: `surface`. */
  surface: string
}
