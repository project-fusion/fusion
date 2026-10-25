/**
 * How a line that scrolls across sizes the items in it that grow, as tabs at
 * `width="full"` do: each at least as wide as its own content.
 */
export interface Fill {
  /**
   * Each item's own width, by its place among the items, once all of them
   * have been measured at the current text size.
   */
  readonly least?: readonly number[]
  /** Tells the line an item's own width, by its place among `count` items, as it is measured. */
  readonly report: (place: number, width: number, count: number) => void
}

/** The scrolling part whose children are being drawn. */
export interface Scrolling {
  /** The axis it scrolls along. */
  readonly axis: 'x' | 'y'
  /** How it sizes the items that grow in it, where it scrolls across. */
  readonly fill?: Fill
  /** Whether there is more past each end, which shows the scroll button at that end. */
  readonly more: { readonly end: boolean; readonly start: boolean }
}
