/**
 * How an element draws only some of what is passed into it: the first, or
 * the first and the last. Read as syntax, as `tree.ts` says.
 */

/**
 * The prop that says how many of the elements passed in are drawn, as an
 * avatar group folds the people past its `max` into a count. **A phone
 * draws the first that many and leaves the rest out**, as the web hides
 * them. A count of zero or less, or none, draws them all.
 */
export interface Fold {
  /** The element's prop that holds the count. */
  readonly max: string
  /**
   * **Folds the middle away**: the first element and the last `max` less
   * one stay, at least two, and the first takes how many were folded in its
   * `count` prop, the elements folded in its `items` prop, and the element's
   * own `words` prop in its `label` prop, as a trail's first crumb draws the
   * menu of the crumbs folded after it.
   */
  readonly middle?: {
    readonly count: string
    readonly items: string
    readonly label: string
    readonly words: string
  }
}

/** How many of the elements passed in are drawn. */
export const fold = (fields: Fold): Fold => fields
