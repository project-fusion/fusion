/**
 * How an element that windows a long set of items says so in its headless
 * source, as a virtual list does. Read as syntax, as `tree.ts` says.
 */

/**
 * What an element that windows a long set reads and sends. A `<Repeat windowed>`
 * reads `list`, the rows near the screen. Its first child is a copy for each
 * row, and what follows stands after the rows, inside what scrolls.
 */
export interface Window {
  /** The name of the value the element computes as the rows, which a repeat's `each` binds. */
  readonly list: string
  /** The prop that holds how many items a line holds. */
  readonly columns?: string
  /** The prop that holds the keys of the items a reader cannot choose or move to. */
  readonly disabledKeys?: string
  /** The state the element is in while it holds no items. */
  readonly empty?: string
  /** The prop that holds the length of one row before it is drawn. */
  readonly estimate?: string
  /** The prop that holds the space between two rows, and between two columns. */
  readonly gap?: string
  /** The state the element is in while it runs across. */
  readonly horizontal?: string
  /** The prop that holds the items. */
  readonly items?: string
  /** The prop that names the field of each item that is its key. */
  readonly keyField?: string
  /** The prop that says how items of more than one column are laid out. */
  readonly layout?: string
  /** The prop that says more items are on their way. */
  readonly loading?: string
  /** The state the element is in while more items are on their way. */
  readonly loadingState?: string
  /** The prop that holds the narrowest a column may be. */
  readonly minColumnWidth?: string
  /** The event sent before the chosen items change, which a handler can cancel. */
  readonly onBeforeChange?: string
  /** The event sent before an item moves, which a handler can cancel. */
  readonly onBeforeReorder?: string
  /** The event sent once the chosen items changed. */
  readonly onChange?: string
  /** The event sent once a reader comes within one screen of the end. */
  readonly onLoadMore?: string
  /** The event sent as the items on screen change. */
  readonly onRangeChange?: string
  /** The event sent once an item moved. */
  readonly onReorder?: string
  /** The prop that says which way the list runs. */
  readonly orientation?: string
  /** The prop that lets a reader move items. */
  readonly reorderable?: string
  /** The prop that names the field of each item that names its section. */
  readonly sectionField?: string
  /** The prop that says what a press does to the items already chosen. */
  readonly selectionBehavior?: string
  /** The prop that says how many items a reader can choose. */
  readonly selectionMode?: string
  /** The prop that names the field of each item that typing matches. */
  readonly textField?: string
  /** The prop that holds the keys of the chosen items. */
  readonly value?: string
}
