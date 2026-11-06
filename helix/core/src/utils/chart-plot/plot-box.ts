/**
 * The box every chart draws into, in its own units, as numbers with no
 * element in them, so a phone's drawing and the web's agree on it.
 *
 * Here for the reason `PALETTE` is beside it: six families drew into the same
 * square and declared it six times under three names. A round hundred so a `d`
 * attribute is readable in the inspector.
 *
 * **Two names for one number, because the axes are two facts.** `x2=${PLOT_WIDTH}`
 * and `y2=${PLOT_HEIGHT}` say which edge they reach; one name used twice says
 * nothing, and the day a chart is not square the call sites are already right.
 * `Sparkline` is that day already: it is a strip and not a plot, so it takes
 * this width and states its own height beside it.
 */
export const PLOT_WIDTH = 100

/** The drawing's own height. See `PLOT_WIDTH`. */
export const PLOT_HEIGHT = 100

/**
 * How many colors the series palette has, and so where it starts over.
 *
 * Here rather than in each chart, because a number two files have to agree on
 * is a number that will stop agreeing: when the palette went from eight to
 * twenty-four, one of five copies was missed and drew every ninth series in the
 * first color while the legend beside it named the ninth.
 */
export const PALETTE = 24

/** The palette slot for the nth series, counting from one and wrapping. */
export const seriesIndex = (depth: number): number => (depth % PALETTE) + 1
