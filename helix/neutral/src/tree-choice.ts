/**
 * How the elements of a tree say so in their headless sources. Read as syntax,
 * as `tree.ts` says.
 */

/**
 * What the element around a tree's items reads and sends. **The web's element
 * walks its own items**, and a phone's items join it through a context, each
 * saying which item it stands in.
 */
export interface TreeChoice {
  /** The prop that holds the chosen value, or under `multiple`, the checked values. */
  readonly active?: string
  /** The prop that holds what a reader hears when a held item is put back. */
  readonly canceledLabel?: string
  /** The prop that says which end of a row the chevron sits at. */
  readonly chevronPlacement?: string
  /** The prop that seeds the chosen value. */
  readonly defaultActive?: string
  /** The prop that holds what a reader hears when a held item is dropped. */
  readonly droppedLabel?: string
  /** Whether the element holds no items, the name a render binds. */
  readonly empty?: string
  /** The prop that names the tree. */
  readonly label?: string
  /** The prop that holds what a reader hears when an item moves into another branch. */
  readonly movedIntoLabel?: string
  /** The prop that holds what a reader hears when an item moves among its siblings. */
  readonly movedLabel?: string
  /** The prop that says what a deeper level means. */
  readonly nesting?: string
  /** The event sent before the chosen value changes, which a handler can cancel. */
  readonly onBeforeChange?: string
  /** The event sent before an item moves, which a handler can cancel. */
  readonly onBeforeReorder?: string
  /** The event sent once the chosen value changed. */
  readonly onChange?: string
  /** The event sent once an item moved. */
  readonly onReorder?: string
  /** The prop that holds what a reader hears when an item is picked up. */
  readonly pickedUpLabel?: string
  /** The prop that lets a reader move items. */
  readonly reorderable?: string
  /** The prop that says whether a reader checks many items, or chooses only the ends. */
  readonly selectionMode?: string
}

/** What an item of a tree reads, sends, and computes. Each computed value is the name a render binds. */
export interface TreeItemChoice {
  /** Whether the item holds items. */
  readonly branch?: string
  /** Whether the item draws a check mark. */
  readonly checkable?: string
  /** Whether the check mark draws its check. */
  readonly checkMark?: string
  /** Whether the chevron stands past the `end` region. */
  readonly chevronEnd?: string
  /** Whether the chevron stands against the item's words. */
  readonly chevronLabel?: string
  /** Whether the chevron stands at the start of the row. */
  readonly chevronStart?: string
  /** Whether the check mark draws its bar, while some of a branch's items are checked. */
  readonly dashMark?: string
  /** The prop that keeps the item from being chosen, opened, or followed. */
  readonly disabled?: string
  /** Whether the row draws a grip. */
  readonly grip?: string
  /** Whether the item is a branch that names the list under it. */
  readonly heading?: string
  /** The prop that makes the row a link. */
  readonly href?: string
  /** The prop that says the item's children load as it opens. */
  readonly lazy?: string
  /** Whether the item holds no items. */
  readonly leaf?: string
  /** How deep the row sits, counting from one. */
  readonly level?: string
  /** Whether the row is a link. */
  readonly linked?: string
  /** Whether the item sits inside another. */
  readonly nested?: string
  /** The event sent as the item is chosen, which a handler can cancel. */
  readonly onBeforeSelect?: string
  /** The event sent as a lazy item opens. */
  readonly onLoad?: string
  /** What a reader hears of the item's level and its place among its siblings. */
  readonly place?: string
  /** The prop that holds a link's relation to this page. */
  readonly rel?: string
  /** Whether a leaf leaves a gutter where a chevron would stand. */
  readonly reserved?: string
  /** Whether a nested row takes the smaller size. */
  readonly subordinate?: string
  /** The prop that says where a link opens. */
  readonly target?: string
  /** The prop that holds the item's value. */
  readonly value?: string
}
