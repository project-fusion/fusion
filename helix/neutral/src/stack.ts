/**
 * How an element that shows a stack of pages one at a time says so in its
 * headless source, as a drilldown and a menu that drills do. Read as syntax,
 * as `tree.ts` says.
 */

/**
 * What a stack of pages holds. A row whose `item()` names its `page` region
 * holds that page's rows, so the tree of rows is the stack's state: a press
 * on a row with a page shows the page in place of the one showing, and the
 * `back` press shows the page above, one level. **The element's collection
 * holds the rows**, so the stack's element declares one too.
 */
export interface Stack {
  /** The pressable that goes back one page, as a drilldown's `back`. */
  readonly back: string
  /**
   * The cancelable event sent before a move into a page or back out of one,
   * its detail the `value` of the row whose page would show, empty for the
   * top page, as a drilldown's `navigate`.
   */
  readonly before?: string
  /**
   * The name of the value the element computes while a page below the top
   * is showing, as a drilldown is `drilled`, which a rule's `state` and a
   * `when()` read.
   */
  readonly drilled?: string
  /**
   * The state the element is in once a move has gone into a page, until the
   * next move, as a drilldown is `forward`, which a rule's `state` reads to
   * slide the page in from the side it came from. The part that holds the
   * rows starts its motion again with each move, on both platforms.
   */
  readonly entered?: string
  /**
   * The name of the value the element computes as the words of the page
   * showing, empty on the top page, which a `text()` says with `bind()`, as
   * a drilldown's title says the page's name.
   */
  readonly label?: string
  /**
   * The state the element is in once a move has gone back out of a page,
   * until the next move, as a drilldown is `back`.
   */
  readonly left?: string
  /**
   * The prop that holds the `value` of the row whose page is showing, empty
   * for the top page. Writing it shows that page.
   */
  readonly page?: string
  /**
   * The prop or the computed value whose words the `label` value holds on
   * the top page, where the top page has a name of its own, as a
   * drilldown's top page is named by its `label`. Without it, `label` is
   * empty on the top page.
   */
  readonly top?: string
  /**
   * The props the stack writes on each row it draws as a row, by the row's
   * prop, from the element's prop that holds each, as a drilldown under
   * `navigation` writes its rows `listed`, which the web writes as a
   * property. A row whose page is showing, or holds the page showing, is
   * written none, since it draws no row of its own.
   */
  readonly writes?: Readonly<Record<string, string>>
}

/** What a stack of pages holds. */
export const stack = (fields: Stack): Stack => fields
