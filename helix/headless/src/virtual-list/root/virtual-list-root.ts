import {
  AriaForwardController,
  anchorAt,
  commaList,
  customElement,
  elementById,
  HelixElement,
  HelixLoadMoreEvent,
  inRowOrder,
  isRtl,
  numberConverter,
  pressedOwnControl,
  type Rendered,
  rangeAdd,
  requestValue,
  SCROLLER_RULE,
  searchableById,
  selectsAll,
  Typeahead,
  toggleValue,
  typesCharacter,
  VIRTUAL_RULE,
  VirtualizeController,
  Waterfall,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, render, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { holdControls, releaseControls } from '../controls.js'
import { HelixRangeChangeEvent } from '../events/index.js'
import { fillHoles, keyOf, textsOf } from '../fill.js'
import { skipDisabled, stepIndex } from '../keys.js'
import { drawPlan, itemsOf, stopAfter } from '../plan.js'
import { entryOf, headOf, itemsIn, type Sections, sectionAt, sectionsOf } from '../sections.js'

/**
 * Draws one item into its row, for a list given `renderItem`.
 *
 * Returns anything Lit renders: a template from `html`, a string, or a DOM
 * node the function built. `Item` types the item, so a page writes
 * `const row: VirtualListRenderer<Person> = (person) => person.name`.
 */
export type VirtualListRenderer<Item = unknown> = (item: Item, index: number) => unknown

/**
 * Draws one section's header, for a list given `sectionField`, given the
 * section's name and its place among the sections. Returns anything Lit
 * renders.
 */
export type VirtualListSectionRenderer = (name: string, index: number) => unknown

/** Where `scrollToIndex` puts an item, and how it gets there. */
export interface VirtualListScrollOptions {
  /**
   * Where the item lands: the least distance that shows it whole (`nearest`,
   * the default), or at the box's `start`, `center` or `end`.
   */
  align?: 'center' | 'end' | 'nearest' | 'start'
  /** The platform's scroll behavior. Instant when left out. */
  behavior?: ScrollBehavior
}

/** The items on screen: `items.slice(first, last)`. */
export interface VirtualListRange {
  /** The index of the first item on screen. */
  first: number
  /** One past the index of the last item on screen. */
  last: number
}

/** How many lists have drawn sections, for each one's header ids. */
let sectionCount = 0

/** A new prefix for one list's header ids. */
const nextSectionId = (): string => {
  sectionCount += 1
  return `virtual-list-${sectionCount}`
}

/** The rows in the tree: the list's children, or a section's in a list with sections. */
const ROWS = ':scope > [data-index], :scope > [data-section] > [data-index]'

/** The start of the name of the slot each line of a grid is drawn in. */
const LINE = 'helix-line-'

/**
 * @summary A list that renders only the rows of a long set that are on screen.
 *
 * @description
 * The items arrive as data, in one of two ways:
 *
 * - `items` takes an array. A framework sets it as a property, and React
 *   hydration keeps it.
 * - `for` names a `<script type="application/json">` that holds an array, which
 *   a server sends as markup.
 *
 * Each item is drawn into a row in one of two ways:
 *
 * - `renderItem` is a function from an item and its index to the row's
 *   content: a Lit template, a string, or a DOM node.
 * - A `<template>` child defines one row. `data-field="name"` fills an element
 *   with the item's `name` as text, and `data-field-href="url"` writes the
 *   item's `url` into `href`, the same for any attribute. A field may be a path
 *   of keys, such as `author.name`.
 *
 * Rows are your markup in the light DOM, so your stylesheet styles them.
 *
 * **A grid.** `columns` lays the items out that many to a line, as a grid of
 * equal columns, and windows the set a line at a time, as React Aria's grid
 * layout does. Each item draws one element, a cell of the grid, and
 * `estimate` is the height of a line. `min-column-width` lays out as many
 * columns as fit the box instead, as React Aria's grid layout does with its
 * smallest item size, and follows the box as it resizes. `gap` spaces the rows, and the columns
 * of a grid, by a number of pixels the list counts in each row's place.
 *
 * A grid without `selection-mode` is a grid to a reader, as the APG's grid
 * and React Aria's grid list are: the box is a `grid` with `aria-rowcount`
 * and `aria-colcount`, each line drawn is a `row` with `aria-rowindex`, and
 * each item a `gridcell` with `aria-colindex`. Each line is a slot of the
 * list's own, so your rows stay its children: give an item one element. With
 * `selection-mode` it stays a list box of options, as React Aria's list box
 * in a grid layout does.
 *
 * **A waterfall.** `layout="waterfall"` puts each item, in the order of the
 * set, under the column that ends highest so far, the leftmost of a tie, as a
 * wall of photos of different heights is, and as React Aria's waterfall
 * layout and TanStack Virtual's lanes do. `columns`, or `min-column-width`,
 * says how many columns. Every item is measured, at the width of its column,
 * and placed at its column and its height, so items of any height leave no
 * holes. The list draws the items that reach into the box, and the item
 * holding focus. A reader hears a list, or a list box, in the order of the
 * set, which is also the order Tab and a screen reader's own keys take.
 *
 * In a waterfall, Down and Up move along the column to the next or the
 * previous item in it, Right and Left move to the next or the previous
 * column, to the item there that sits beside this one the most, or the
 * nearest above where none does, and Page Down and Page Up move a box down
 * or up the column. Home and End go to the first and the last item of the
 * set, and Shift with a key takes in the items between in the order of the
 * set.
 *
 * **Across.** `orientation="horizontal"` lays the items out along a line and
 * scrolls it sideways, as a strip of cards does, windowed the same way:
 * `estimate` is then an item's width, and the box needs an inline size.
 *
 * **Sections.** `section-field` names the field of each item that says which
 * section it is in, and the list draws a header before each section's items,
 * as React Aria's list box sections do. Each section is an element with the
 * `group` role, named by its header, which is its first child and carries
 * `data-header`, so your stylesheet styles it, such as with `position:
 * sticky`. A section starts wherever the field changes, so give the items in
 * order. The window counts the headers with the items, and a section the
 * window starts inside is drawn with its header. `renderSection` draws a
 * header of your own.
 *
 * **Keyboard.** The list is one tab stop.
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Up | Moves to the next or the previous item, or in a grid to the item in the same column on the next or the previous line, or in a waterfall to the next or the previous item down the same column. |
 * | Right, Left | In a grid, moves to the next or the previous item along the line, the other way round on a right-to-left page. In a waterfall, moves to the item beside in the next or the previous column. In a list that runs across, moves to the next or the previous item the same way, and Down and Up are left to the row. |
 * | Home, End | Moves to the first or the last item. In a grid without `selection-mode`, to the first or the last item of the line. |
 * | Control or Command with Home or End | In a grid without `selection-mode`, moves to the first or the last item. |
 * | Page Down, Page Up | Moves by the number of items, or of lines in a grid, on screen, or in a waterfall a box down or up the column. |
 * | A letter or a word | Moves to the next item whose text starts with what you typed. |
 * | Escape | Lets go of every chosen item, in a list with `selection-mode`. |
 * | Alt with Up or Down | In a `reorderable` list, moves the item a place. Alt with Home or End moves it to either end. |
 * | Tab | Moves into the focused row's own links and buttons, then out of the list. |
 *
 * An item that is not drawn is scrolled into view and focused, so a keyboard
 * reaches the whole set. The row a reader last focused keeps the tab stop and
 * stays drawn when it scrolls away, so Tab and Shift+Tab come back to it, as
 * React Aria's collections do. In a list nobody has focused yet, the stop
 * moves to the first row on screen. Typing matches each item's
 * `text-field`, which is the first `data-field` of the row template by default,
 * or the item itself when it is a string or a number.
 *
 * Each row says its place in the whole set with `aria-posinset` and
 * `aria-setsize`, so a screen reader says "4,000 of 10,000", and each cell of
 * a grid its line and its column. The row holding focus stays drawn when it
 * scrolls out.
 *
 * **Selecting.** `selection-mode` makes the list a list box a reader chooses
 * from: `single` selects one item and `multiple` any number. Space or a press
 * selects an item, Shift with Space, an arrow, Home, End or a press takes in
 * the items from the last one chosen, and Control or Command with A selects
 * them all, in `multiple`. Escape lets go of every chosen item, and keeps the
 * key from the dialog or menu around the list while there was something to
 * let go of. `value` holds the chosen items' keys, separated by commas, in
 * the order of the set: `key-field` names each item's key, and a string or a
 * number item is its own key. A change asks with `helix-before-change` and
 * tells with `change`. Each row is an `option` marked `aria-selected`, so a
 * row's own links and buttons are not reached there: keep those to a list
 * without `selection-mode`.
 *
 * `selection-behavior="replace"` selects the item pressed alone, as a file
 * list does, and the arrow keys carry the selection with them. Control or
 * Command with a press or with Space adds or takes out one item, and with an
 * arrow moves without selecting.
 *
 * **Disabled items.** `disabled-keys` names items by their keys, separated by
 * commas. Their rows carry `aria-disabled`, the keys and typing pass over
 * them, and a press, Space, or Control with A does not select them.
 *
 * **Rows a stylesheet can tell apart.** A chosen row carries `data-selected`,
 * a disabled one `data-disabled`, as React Aria's rows do, and the row the
 * keys are on, which holds the tab stop, `data-active`, whether or not the
 * list has focus.
 *
 * **Loading more.** `helix-range-change` fires as the items on screen change,
 * and `range` holds them. `helix-load-more` fires once a reader is within one
 * screen of the end, once for each length of the set: add to `items` and it can
 * fire again. While you fetch, set `loading`: the list is busy, and a row after
 * the last item says "Loading more" (`loading-text`, or your own content in
 * the `loading` slot). `scrollToIndex` takes a reader to an item.
 *
 * **Moving items** is a separate import, `@fusion.dev/helix/virtual-list/reorder`,
 * as React Aria's drag and drop is. With it imported, `reorderable` lets a
 * reader move items in a list of one column without sections:
 *
 * - Alt with Up or Down moves the item the keys are on a place, and Alt with
 *   Home or End to either end, as the APG's rearrangeable listbox does.
 * - A pointer drags a whole row. A press that does not travel is still a
 *   press. The list scrolls near an edge, and an item far down a long set is
 *   reached by dragging to the edge.
 * - A drop sends `helix-before-reorder`, which you can refuse, and then
 *   `helix-reorder`, whose `keys` hold every item's key in the new order.
 *   **You move the items**: set `items` to them in that order. The keys stay
 *   on the item that moved.
 * - Each move is said in a region screen readers announce. The row being
 *   dragged carries `data-dragging`, and the row a drop would land beside
 *   `data-drop-before` or `data-drop-after`.
 *
 * **An empty list.** Set `empty-text`, or put your own content in the `empty`
 * slot, for a row shown when there are no items and none are loading, such as
 * "No messages yet" and a link to write one. Without either, an empty list
 * shows nothing, since a list whose items have not arrived yet has not said
 * it has none.
 *
 * The list takes the `empty` state while it has read its items and holds none,
 * and the `loading` state while `loading` is set, so your stylesheet can
 * change the box around it for either. A list with no name is reported once
 * in a development build. Name it with `label` or `aria-label`.
 *
 * **Row height.** Rows are placed by `estimate` until they are drawn. Then the
 * list reads the drawn rows' height once and places every row by it, so a
 * wrong estimate still reaches the last item. Set `measured` for rows of
 * different heights. Once the list draws rows of different heights, such as
 * rows that wrap on a narrow screen, it places each row by its own height
 * whether `measured` is set or not.
 *
 * The list follows its source. A new `items` array, an edit to the script's
 * text, or a script replaced under the same id draws the new rows. A row that
 * stays in view keeps its element as the list scrolls.
 *
 * The viewport scrolls on this tier. It carries `data-scroller`, and `core`
 * ships `[data-scroller] { overflow: auto }` into every shadow root, so
 * `scrollTop` works with no stylesheet. You still need to set a block size.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @documentation https://fusion.dev/helix/components/virtual-list
 *
 * @slot - The `<template>` that defines one row. The list writes the rows it renders beside it, and this slot shows them between the two spacers.
 * @slot empty - Content for the row shown when there are no items and none are loading. Falls back to `empty-text`.
 * @slot loading - Content for the row after the last item while `loading` is set. Falls back to `loading-text`.
 *
 * @event {Event} change - Fired once a press or a key has changed which items are selected, in a list with `selection-mode`.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press or a key changes which items are selected, with the `value` it would leave. Cancelable.
 * @event {HelixBeforeReorderEvent} helix-before-reorder - Fired when an item is dropped at a new place, in a `reorderable` list with `@fusion.dev/helix/virtual-list/reorder` imported, with every key in the new order. Cancelable: cancel it to keep the item where it is.
 * @event {HelixLoadMoreEvent} helix-load-more - Fired when a reader comes within one screen of the last item, once for each length of the set.
 * @event {HelixRangeChangeEvent} helix-range-change - Fired when the items on screen change, with the new `first` and `last`, which `range` also holds.
 * @event {HelixReorderEvent} helix-reorder - Fired after `helix-before-reorder` when nobody canceled it. Set `items` to the order in `keys`.
 *
 * @csspart after - The space that stands in for the rows below the rendered ones.
 * @csspart before - The space that stands in for the rows above the rendered ones.
 * @csspart empty - The row shown when there are no items and none are loading, where `empty-text` or the `empty` slot gives it content.
 * @csspart loading - The row after the last item while `loading` is set.
 * @csspart viewport - The scrolling box. On this tier, it needs only a block size.
 *
 * @cssstate empty - While the list has read its items and holds none.
 * @cssstate horizontal - While the list runs across, with `orientation="horizontal"`.
 * @cssstate loading - While `loading` is set.
 */
@customElement('helix-headless-virtual-list')
export class HelixHeadlessVirtualList extends HelixElement {
  protected static override markRules = [SCROLLER_RULE, VIRTUAL_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-virtual-list': { loadingText: 'Weitere werden geladen' } })`.
   */
  static words = 'helix-virtual-list'

  /**
   * How many items a line holds. One, the default, is a list; more lays the
   * items out as a grid of that many equal columns, windowed a line at a
   * time, with Left and Right moving along a line.
   */
  @property({ converter: numberConverter('columns', 1) })
  columns = 1

  /**
   * The keys of the items a reader cannot choose or move to, separated by
   * commas, as `value` writes keys. Their rows carry `aria-disabled`.
   */
  @property({ attribute: 'disabled-keys' })
  disabledKeys = ''

  /**
   * The old name of `empty-text`, read only where a page sets it.
   *
   * @deprecated Use `empty-text`. Removed in the next release.
   */
  @property({ attribute: 'empty-label' })
  emptyLabel?: string

  /**
   * The text of the row shown when there are no items and none are loading,
   * where the `empty` slot is empty. Empty, the default, shows no row.
   */
  @property({ attribute: 'empty-text' })
  emptyText = ''

  /**
   * The height of one row, in pixels, used to find the row at a scroll offset.
   *
   * An estimate rather than a measurement while `measured` is off, which is
   * right whenever the rows really are one height and is the cheaper of the two.
   */
  @property({ converter: numberConverter('estimate', 32, 'pixels') })
  estimate = 32

  /**
   * The id of the script element that holds the items as JSON. `items` wins
   * where both are set.
   */
  @property()
  for = ''

  /**
   * The space between two rows, and between two columns in a grid, in
   * pixels. The list counts it in each row's place, so a gap does not walk
   * the rows away from the scroll position the way a margin on each row
   * would.
   */
  @property({ converter: numberConverter('gap', 0, 'pixels') })
  gap = 0

  /**
   * The items, as an array. Set it as a property.
   *
   * Each item is drawn by `renderItem`, or into the row `<template>` by its
   * fields. A new array draws the new rows, so replace the array to change it.
   * Left unset, the list reads the script that `for` names.
   */
  @property({ attribute: false })
  items: readonly unknown[] | undefined

  /**
   * The field of each item that is its key in `value`, as a key or a path of
   * keys. Empty reads a string or a number item as its own key, and any
   * other item by its place in the set.
   */
  @property({ attribute: 'key-field' })
  keyField = ''

  /**
   * The list's name, read by screen readers, because only some of its rows
   * are rendered at a time.
   *
   * An `aria-label` or `aria-labelledby` on the host names the list too, and
   * wins over this.
   */
  @property()
  label = ''

  /**
   * How items of more than one column are laid out. `grid`, the default, puts
   * them in lines of equal columns. `waterfall` puts each item, in the order
   * of the set, under the column that ends highest, as a wall of photos of
   * different heights is: `columns`, or `min-column-width`, says how many
   * columns. Rows of a waterfall are measured, and Up and Down move along a
   * column.
   */
  @property()
  layout: 'grid' | 'waterfall' = 'grid'

  /**
   * Marks the list as busy fetching more items, and draws a row after the last
   * item that says so.
   *
   * Set it when `helix-load-more` starts a fetch, and clear it when the items
   * arrive. The list does not ask for more while it is set.
   */
  @property({ type: Boolean })
  loading = false

  /**
   * The old name of `loading-text`, read only where a page sets it.
   *
   * @deprecated Use `loading-text`. Removed in the next release.
   */
  @property({ attribute: 'loading-label' })
  loadingLabel?: string

  /** The text of the row drawn while `loading` is set, where the `loading` slot is empty. */
  @words
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading more'

  /**
   * Places each row by its own measured height. Without it, rows are placed
   * by one height: `estimate` until rows are drawn, then the drawn rows' height,
   * read once. Rows that come out different heights are placed by their own
   * heights either way.
   *
   * **Off by default, because the straight line is better when it holds.** One
   * height makes offset and index convert by division, which can never
   * disagree with itself; measuring is what a set of genuinely different
   * heights needs and costs a read of each row as it renders. A list of
   * one-line rows should leave this alone.
   */
  @property({ type: Boolean })
  measured = false

  /**
   * The narrowest a column of a grid may be, in pixels. Set, the list lays
   * out as many columns as fit the box at that width, at least one, and
   * follows the box as it resizes, which `columns` then does not decide.
   */
  @property({
    attribute: 'min-column-width',
    converter: numberConverter('min-column-width', 0, 'pixels'),
  })
  minColumnWidth = 0

  /**
   * Which way the list runs. `horizontal` lays the items out along a line
   * and scrolls it sideways: Left and Right move between items, the other
   * way round on a right-to-left page, and `estimate` is an item's width. A
   * grid and a waterfall always run down.
   */
  @property()
  orientation: 'horizontal' | 'vertical' = 'vertical'

  /**
   * Draws one item into its row, given the item and its index. Set it as a
   * property.
   *
   * It returns what Lit renders: a template from `html`, a string, or a DOM
   * node. The list wraps each result in a `<div>` that carries the row's role
   * and place in the set. Where it is unset, the row `<template>` is used.
   */
  @property({ attribute: false })
  // biome-ignore lint/suspicious/noExplicitAny: a renderer typed for any item is assignable here
  renderItem: VirtualListRenderer<any> | undefined

  /**
   * Draws each section's header, given its name and its place among the
   * sections, for a list given `section-field`. Set it as a property. Where
   * it is unset, the header is the name as text.
   */
  @property({ attribute: false })
  renderSection: VirtualListSectionRenderer | undefined

  /**
   * Lets a reader move items, once `@fusion.dev/helix/virtual-list/reorder`
   * (or `@fusion.dev/helix-headless/virtual-list/reorder`) is imported: Alt
   * with an arrow moves the row the keys are on, and a pointer drags a row.
   * The list moves no item itself: you move your `items` on `helix-reorder`.
   * Without that import it does nothing, so a list that never moves items
   * carries none of the code. A list of one column, without sections or a
   * waterfall.
   */
  @property({ type: Boolean })
  reorderable = false

  /**
   * The field of each item that names its section, as a key or a path of
   * keys. Set, the items are drawn in sections: a header, then the items, in
   * an element with the `group` role that the header names. A section starts
   * wherever the field changes, so give the items in order. A list of one
   * column only.
   */
  @property({ attribute: 'section-field' })
  sectionField = ''

  /**
   * What a press does to the items already chosen: `toggle` adds or takes out
   * the item, and `replace` selects it alone and lets the arrow keys carry the
   * selection, with Control or Command adding or taking out one item.
   */
  @property({ attribute: 'selection-behavior' })
  selectionBehavior: 'replace' | 'toggle' = 'toggle'

  /**
   * Makes the list a list box a reader chooses from: `single` selects one
   * item, and `multiple` any number. Unset is a list a reader reads.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: 'multiple' | 'single'

  /**
   * The field of each item that typing matches, as a key or a path of keys
   * (`author.name`).
   *
   * Empty by default, which matches the first `data-field` of the row
   * template, or the item itself where it is a string or a number.
   */
  @property({ attribute: 'text-field' })
  textField = ''

  /**
   * The keys of the chosen items, separated by commas, in a list with
   * `selection-mode`. Set it to start with items chosen.
   */
  @property()
  value = ''

  /**
   * The parsed script.
   *
   * Empty on a server, which has nothing to read.
   */
  @state()
  private rows: unknown[] = []

  /** The `for` that `rows` came from, so it is read again only when that changes. */
  private readFor: string | undefined

  /** The items the drawn rows were filled from, so new data fills them again. */
  private filledFrom: readonly unknown[] | undefined

  /** The function the drawn rows were filled by, so a new one draws them again. */
  // biome-ignore lint/suspicious/noExplicitAny: whatever renderer `renderItem` held
  private filledBy: VirtualListRenderer<any> | undefined

  /** Whether the drawn rows were cloned from the template or drawn for `renderItem`. */
  private drawnBy: 'function' | 'template' | undefined

  /** The script the rows were read from, which the watcher follows. */
  private source: Element | null = null

  /**
   * The item whose row holds the tab stop.
   *
   * A plain field, because the pass that places the rows is the one that keeps
   * it on a drawn row and writes the `tabindex` that follows from it.
   */
  private active = 0

  /** The item whose row's own controls are in the tab order. */
  private released: number | undefined

  /** The range last reported, so `helix-range-change` fires only on a change. */
  private said: VirtualListRange = { first: 0, last: 0 }

  /** The letters typed at the list, which move to the item they start. */
  private readonly typeahead = new Typeahead()

  /** The key of the item a Shift range runs from: the last one chosen. */
  private anchor: string | undefined

  /**
   * Watches the source and the tree around it.
   *
   * **The list read its source once per `for`**, so a page that wrote new JSON
   * into the script, the way a framework updates a text child, kept the old
   * rows. The script's own text is watched, and the tree it sits in, for a
   * script replaced under the same id.
   */
  private watcher: MutationObserver | undefined

  /**
   * Watches the drawn rows for a change of size after they were drawn: an
   * image that loads, a row that opens, text a page edits in place.
   *
   * **Measured once, a row that grew later kept its old height**, so the
   * window and the spacers placed every row after it by the old one. React
   * Aria's virtualizer observes its items for the same reason. A frame later,
   * so a size the next render changes is not asked of the browser's pass over
   * the observers a second time.
   */
  private sizes: ResizeObserver | undefined

  /** The frame the next measure of resized rows waits for. */
  private resized: number | undefined

  /** Carries a host `aria-label` and `aria-labelledby` to the element with the `list` role. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('viewport'),
    /* A list with no name is announced as a list and nothing more, and only a
       window of its rows is there to say what it holds. Development builds only. */
    unnamed: 'virtual-list',
  })

  /* No `overscan` property. The controller's four is a frame of fast scrolling
     at a 32 pixel row, which is a fact about the platform rather than a
     preference. */
  /* Windowed by lines, which are the items themselves in a list, and the
     headers and the items in a list with sections. */
  private readonly virtualize = new VirtualizeController(this, {
    container: () => this.partNamed('viewport'),
    count: () =>
      this.sections
        ? this.data.length + this.sections.starts.length
        : Math.ceil(this.data.length / this.across),
    estimate: () => this.estimate,
    gap: () => this.space,
    horizontal: () => this.horizontal,
    measured: () => this.measured,
    rows: () => this.lines(),
    waterfall: () => {
      this.lanes.lanes = this.columnCount
      return this.waterfall ? this.lanes : undefined
    },
  })

  /**
   * The items on screen, as `items.slice(first, last)` reads them.
   *
   * Read from the scroll offset when asked. Both are 0 before the list has a
   * box to measure.
   */
  get range(): VirtualListRange {
    return this.itemsOn(this.virtualize.visible())
  }

  /** The gap in pixels, none where it is not a positive number. */
  private get space(): number {
    return Number.isFinite(this.gap) && this.gap > 0 ? this.gap : 0
  }

  /** Where each item of a waterfall stands, which the controller places. */
  private readonly lanes = new Waterfall()

  /** Whether the items are laid out as a waterfall, each down a column. */
  private get waterfall(): boolean {
    return this.layout === 'waterfall'
  }

  /**
   * Whether the list is a grid a reader reads, and not a list box: lines of
   * columns with no `selection-mode`, which are `grid`, `row` and `gridcell`
   * to a reader, as the APG's grid and React Aria's grid list are.
   */
  private get lined(): boolean {
    return (
      !this.selectionMode &&
      !this.waterfall &&
      !this.horizontal &&
      this.sections === undefined &&
      (this.across > 1 || this.minColumnWidth > 0)
    )
  }

  /**
   * How many items a line holds, which a waterfall draws one at a time: its
   * columns are not lines.
   */
  private get across(): number {
    return this.waterfall ? 1 : this.columnCount
  }

  /**
   * How many columns there are: as many as fit at `min-column-width` where
   * it is set and the box has a width, and `columns` otherwise, at least one.
   */
  private get columnCount(): number {
    if (this.minColumnWidth > 0 && this.boxWidth > 0) {
      const space = this.space
      return Math.max(1, Math.floor((this.boxWidth + space) / (this.minColumnWidth + space)))
    }
    return Math.max(1, Math.trunc(this.columns) || 1)
  }

  /** How wide the box is, read for `min-column-width`. */
  @state()
  private boxWidth = 0

  /** Watches the box's width, for `min-column-width`. */
  private widthWatch: ResizeObserver | undefined

  /** The items to a line the measurements were taken at, or a waterfall's columns and width. */
  private measuredAcross: number | string = 1

  /**
   * Watches the box for its width while `min-column-width` asks for it, or a
   * waterfall, whose items are as tall as their width makes them.
   */
  private watchWidth(): void {
    const viewport = this.partNamed('viewport')
    if (
      (this.minColumnWidth <= 0 && !this.waterfall) ||
      !viewport ||
      typeof ResizeObserver === 'undefined'
    ) {
      this.widthWatch?.disconnect()
      this.widthWatch = undefined
      return
    }
    if (this.widthWatch) {
      return
    }
    this.widthWatch = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      if (width > 0 && Math.abs(width - this.boxWidth) >= 1) {
        this.boxWidth = width
      }
    })
    this.widthWatch.observe(viewport)
  }

  /** The items a span of lines holds. */
  private itemsOn(lines: { first: number; last: number }): VirtualListRange {
    const sections = this.sections
    return sections
      ? itemsIn(sections, lines, this.data.length)
      : itemsOf(lines, this.across, this.data.length)
  }

  /** The line item `at` is on: its entry in a list with sections. */
  private lineOf(at: number): number {
    const sections = this.sections
    return sections ? entryOf(sections, at) : Math.floor(at / this.across)
  }

  /** Whether the list runs across, which a grid and a waterfall never do. */
  private get horizontal(): boolean {
    return this.orientation === 'horizontal' && this.across === 1 && !this.waterfall
  }

  /** The sections and the items they were read from, kept until either changes. */
  private sectionsRead: { data: readonly unknown[]; field: string; sections: Sections } | undefined

  /** The sections `section-field` divides the items into, in a list of one column. */
  private get sections(): Sections | undefined {
    const data = this.data
    if (this.sectionField === '' || data.length === 0 || this.columnCount !== 1 || this.waterfall) {
      return undefined
    }
    const read = this.sectionsRead
    if (read?.data !== data || read.field !== this.sectionField) {
      this.sectionsRead = {
        data,
        field: this.sectionField,
        sections: sectionsOf(data, this.sectionField),
      }
    }
    return this.sectionsRead?.sections
  }

  /**
   * Scrolls the list to show the item at `index`.
   *
   * By default the least distance that shows it whole. `align` puts it at the
   * `start`, `center` or `end` of the box, and `behavior: 'smooth'` animates the
   * scroll. An index past either end goes to the first or the last item.
   */
  scrollToIndex(index: number, options: VirtualListScrollOptions = {}): void {
    const count = this.data.length
    if (count === 0 || !Number.isFinite(index)) {
      return
    }
    const at = Math.max(0, Math.min(Math.trunc(index), count - 1))
    this.virtualize.reveal(this.lineOf(at), 0, options)
    this.virtualize.measure()
  }

  /** The items in force: `items` where it is set, and the script otherwise. */
  private get data(): readonly unknown[] {
    return this.items ?? this.rows
  }

  /**
   * The rows in the tree, each with the item it drew.
   *
   * **Read off `data-index` rather than counted**, because what is in the tree
   * when the controller asks is what `place` appended on the *previous* pass:
   * `hostUpdated` runs before `updated`, so counting from the current window
   * would record the right heights against the wrong items every time the
   * window moved.
   */
  private drawn(): Rendered[] {
    return [...this.querySelectorAll<HTMLElement>(ROWS)].map((element) => ({
      element,
      index: Number(element.dataset.index),
    }))
  }

  /**
   * The drawn lines, for the controller to measure: each row in a list, and
   * the first item of each line in a grid, whose cell is as tall as its line.
   */
  private lines(): Rendered[] {
    const across = this.across
    const drawn = this.drawn()
    const sections = this.sections
    if (sections) {
      return [
        ...drawn.map(({ element, index }) => ({ element, index: entryOf(sections, index) })),
        ...[...this.querySelectorAll<HTMLElement>(':scope > [data-section] > [data-entry]')].map(
          (element) => ({ element, index: Number(element.dataset.entry) }),
        ),
      ]
    }
    return across === 1
      ? drawn
      : drawn
          .filter(({ index }) => index % across === 0)
          .map(({ element, index }) => ({ element, index: index / across }))
  }

  /**
   * Reads the source named by `for`, before the render that draws it.
   *
   * **Resolved through `getRootNode()`, so a list inside another component's
   * shadow root names a source in that root rather than in the page.** Read
   * against `ownerDocument` it looked in the document whatever tree it was in,
   * and found nothing from inside an app shell or a sandbox, which is
   * indistinguishable here from the miss this tolerates on purpose.
   *
   * Not on the server, per the server rules: the shim has attributes and no
   * tree to look an id up in. Nor while hydrating what a server sent, which it
   * drew with nothing read. A source that is missing or
   * not an array leaves the list empty rather than throwing, because a consumer
   * whose data has not arrived yet is the ordinary case and an empty list says
   * so by itself.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.readFor !== this.for && searchableById(this) && !this.hydrating) {
      this.readFor = this.for
      this.read()
    }
    /* **The rows go in with the spacers that make room for them.** Placed only
       in `updated`, the render had already given the spacers the new window
       while the rows were the old one, and the controller measured that in
       between: at the end of a measured list the content came out 160 pixels
       short, the box pulled its offset up to match, and End left the last item
       below the box. The first render has no box yet, so it places in
       `updated` alone. */
    /* A line holds a different number of items now, so every line measured
       held others. */
    /* A waterfall's items are as tall as their width makes them, so a new
       width or a new number of columns measures them all again. */
    const across = this.waterfall ? `${this.columnCount} ${this.boxWidth}` : this.across
    if (across !== this.measuredAcross) {
      this.measuredAcross = across
      this.virtualize.forget()
    }
    /* Lengths measured down the box, or without headers, place nothing now. */
    if (this.hasUpdated && (changed.has('orientation') || changed.has('sectionField'))) {
      this.virtualize.forget()
    }
    if (this.hasUpdated) {
      if (changed.has('items')) {
        this.keepPlace(changed.get('items') as readonly unknown[] | undefined)
      }
      this.place()
    }
  }

  /**
   * Keeps the reader on the item they were reading when items arrive before
   * it, as a feed loading newer posts above does.
   *
   * **Every index moves by what arrived**, so the drawn rows are renumbered,
   * the tab stop moves with its item, and the controller is told, which moves
   * the scroll offset by the room the new items take. Recognized where the
   * new array ends with the old one: the same items, or the same keys under
   * `key-field`.
   */
  private keepPlace(was: readonly unknown[] | undefined): void {
    const now = this.data
    if (!was || was.length === 0 || now.length <= was.length) {
      return
    }
    const by = now.length - was.length
    const same = (at: number, then: number): boolean =>
      now[at] === was[then] ||
      (this.keyField !== '' &&
        keyOf(now[at], at, this.keyField) === keyOf(was[then], then, this.keyField))
    if (!same(by, 0) || !same(now.length - 1, was.length - 1)) {
      return
    }
    /* The controller counts lines, so a grid holds its place where whole
       lines arrived. */
    if (this.sections) {
      this.virtualize.shift(this.lineOf(by) - 1)
    } else if (by % this.across === 0) {
      this.virtualize.shift(by / this.across)
    }
    for (const row of this.querySelectorAll<HTMLElement>(ROWS)) {
      row.dataset.index = String(Number(row.dataset.index) + by)
    }
    this.active += by
    if (this.released !== undefined) {
      this.released += by
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* On the host, because the rows are light DOM and their events reach it
       without crossing a shadow boundary. */
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusIn)
    this.addEventListener('focusout', this.handleFocusOut)
    if (typeof MutationObserver === 'undefined') {
      return
    }
    this.watcher = new MutationObserver((records) => this.handleMutations(records))
    /* Connected, so the root is the document or a shadow root. */
    this.watcher.observe(this.getRootNode(), {
      characterData: true,
      childList: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.removeEventListener('focusout', this.handleFocusOut)
    this.watcher?.disconnect()
    this.watcher = undefined
    this.sizes?.disconnect()
    this.sizes = undefined
    this.widthWatch?.disconnect()
    this.widthWatch = undefined
    if (this.resized !== undefined) {
      cancelAnimationFrame(this.resized)
      this.resized = undefined
    }
  }

  /** Watches a row drawn on this pass for a change of size. */
  private watchSize(elements: Element[]): void {
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    this.sizes ??= new ResizeObserver(() => {
      if (this.resized !== undefined) {
        return
      }
      this.resized = requestAnimationFrame(() => {
        this.resized = undefined
        this.virtualize.settle()
      })
    })
    for (const element of elements) {
      this.sizes.observe(element)
    }
  }

  /**
   * Reads the source again when its text changed or another element took its
   * id. Rows this list drew are its own writes and are not news.
   */
  private handleMutations(records: MutationRecord[]): void {
    if (this.for === '' || this.hydrating || this.readFor === undefined) {
      return
    }
    const found = elementById(this, this.for)
    const edited = records.some(
      (record) => found !== null && (record.target === found || found.contains(record.target)),
    )
    if (found !== this.source || edited) {
      this.read()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.toggleState('empty', this.readFor !== undefined && this.data.length === 0)
    this.toggleState('loading', this.loading)
    this.toggleState('horizontal', this.horizontal)
    this.watchWidth()
    const was = this.virtualize.window
    this.virtualize.measure()
    /* A window the measure just moved has asked for the render that sizes its
       spacers, and its rows go in with them, in `willUpdate`. */
    if (this.virtualize.window === was) {
      this.place()
    }
    /* The rows are drawn here, after the controller's own measuring pass, so
       they are measured here too. */
    this.virtualize.settle()
    this.report()
  }

  private read(): void {
    const source = this.for === '' ? null : elementById(this, this.for)
    this.source = source
    const text = source?.textContent ?? ''
    if (text.trim() === '') {
      this.rows = []
      return
    }
    try {
      const parsed: unknown = JSON.parse(text)
      this.rows = Array.isArray(parsed) ? parsed : []
    } catch {
      /* Left empty rather than thrown. The source is a consumer's markup, and a
         component that throws on it takes the page down over a comma. */
      this.rows = []
    }
  }

  /**
   * Fires `helix-range-change` when the items on screen moved, and
   * `helix-load-more` when a reader is within one screen of the end.
   *
   * After a render and on every scroll, which are the two times either can
   * change. `helix-load-more` waits for a box with a height, so a list that
   * has not been laid out yet asks for nothing.
   */
  private report(): void {
    const { first, last } = this.range
    if (first !== this.said.first || last !== this.said.last) {
      this.said = { first, last }
      this.dispatchEvent(new HelixRangeChangeEvent({ first, last }))
    }
    if (!this.loading && this.virtualize.endInSight()) {
      this.dispatchEvent(new HelixLoadMoreEvent())
    }
  }

  /**
   * The text typing matches for each item: `text-field`, the template's first
   * `data-field`, or a string or number item itself.
   */
  private texts(): string[] {
    const field =
      this.textField ||
      this.querySelector<HTMLTemplateElement>(':scope > template')
        ?.content.querySelector('[data-field]')
        ?.getAttribute('data-field') ||
      ''
    const off = this.disabled
    const texts = textsOf(this.data, field)
    return off.size === 0 ? texts : texts.map((text, at) => (off.has(this.keyAt(at)) ? '' : text))
  }

  /** The keys `disabled-keys` names. */
  private get disabled(): Set<string> {
    return new Set(commaList(this.disabledKeys))
  }

  /** Whether item `at` is one a reader cannot choose or move to. */
  private isDisabled(at: number): boolean {
    return this.disabledKeys !== '' && this.disabled.has(this.keyAt(at))
  }

  /** The item a row element drew, for an element that is one of the rows. */
  private indexOf(node: EventTarget | null): number | undefined {
    if (!this.isRow(node)) {
      return undefined
    }
    const index = node.dataset.index
    return index === undefined ? undefined : Number(index)
  }

  /** Whether a node is one of the rows: a child, or a child of a section. */
  private isRow(node: unknown): node is HTMLElement {
    const parent = node instanceof HTMLElement ? node.parentElement : null
    return (
      parent === this || (parent?.parentElement === this && parent.hasAttribute('data-section'))
    )
  }

  /** The row that holds the tab stop for item `index`, where it is drawn. */
  private rowFor(index: number): HTMLElement | null {
    return (
      [...this.querySelectorAll<HTMLElement>(ROWS)].find(
        (row) => row.dataset.index === String(index),
      ) ?? null
    )
  }

  /**
   * Moves between items with the keys `stepIndex` names.
   *
   * Only from a row itself. A key pressed in a row's own link, button or field
   * is that control's, so a field in a row keeps its arrows.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return
    }
    const at = this.indexOf(event.target)
    if (at === undefined) {
      return
    }
    /* Space only continues a word, so a row's own use of it is left alone. */
    if (typesCharacter(event) && (event.key !== ' ' || this.typeahead.typing())) {
      const found = this.typeahead.match(event.key, this.texts(), at)
      event.preventDefault()
      if (found >= 0 && found !== at) {
        void this.focusIndex(found)
      }
      return
    }
    const toggle = event.ctrlKey || event.metaKey
    const replacing = this.selectionMode !== undefined && this.selectionBehavior === 'replace'
    if (this.selectionMode && !event.altKey) {
      if (selectsAll(event) && this.selectionMode === 'multiple') {
        event.preventDefault()
        const off = this.disabled
        this.choose(
          this.keys()
            .filter((key) => !off.has(key))
            .join(','),
        )
        return
      }
      if (event.key === ' ' && (!toggle || replacing)) {
        event.preventDefault()
        this.press(at, event.shiftKey, toggle)
        return
      }
      /* As React Aria's lists do, and only where there is something to let
         go of, so the key still reaches a dialog around an empty choice. */
      if (event.key === 'Escape' && this.value !== '' && !toggle && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        this.choose('')
        return
      }
    }
    const extend = event.shiftKey && this.selectionMode === 'multiple'
    const ends = event.key === 'Home' || event.key === 'End'
    /* In a grid, Home and End keep to the line, and Control or Command with
       them goes to either end of the set, as the APG's grid does. */
    const lined = this.lined
    if (event.altKey || (toggle && !replacing && !(lined && ends)) || (event.shiftKey && !extend)) {
      return
    }
    const count = this.data.length
    const { first, last } = this.virtualize.visible()
    const forward = isRtl(this) ? 'ArrowLeft' : 'ArrowRight'
    /* Across, the keys along the line step as Down and Up do in a column,
       and Down and Up are left to the row. */
    const key = !this.horizontal
      ? event.key
      : event.key === forward
        ? 'ArrowDown'
        : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
          ? 'ArrowUp'
          : event.key === 'ArrowDown' || event.key === 'ArrowUp'
            ? ''
            : event.key
    const disabled = (one: number): boolean => this.isDisabled(one)
    const across = this.across
    const start = at - (at % across)
    const stepped =
      lined && ends && !toggle
        ? key === 'Home'
          ? start
          : Math.min(start + across, count) - 1
        : this.waterfall && !ends
          ? this.inWaterfall(key, at, count, forward)
          : stepIndex(key, at, count, last - first - 1, { across, forward })
    const next =
      stepped === undefined
        ? undefined
        : skipDisabled(key, at, stepped, count, disabled, this.waterfall ? 1 : across)
    if (next === undefined) {
      if (stepped !== undefined) {
        event.preventDefault()
      }
      return
    }
    event.preventDefault()
    void this.focusIndex(next)
    if (extend) {
      this.anchor ??= this.keyAt(at)
      this.press(next, true)
    } else if (replacing && !toggle) {
      this.press(next)
    }
  }

  /**
   * Where a key goes in a waterfall, through the columns `Waterfall.step`
   * reads: along the column for Down, Up, Page Down and Page Up, and to the
   * item beside in the next column or the one before for the keys along the
   * line, the other way round on a right-to-left page. Past a disabled item,
   * on the same way.
   */
  private inWaterfall(key: string, at: number, count: number, forward: string): number | undefined {
    const way =
      key === forward ? 'next' : key === 'ArrowLeft' || key === 'ArrowRight' ? 'previous' : key
    const box = this.partNamed('viewport')
    let to = this.lanes.step(way, at, count, box?.clientHeight ?? 0)
    const again = way === 'PageDown' ? 'ArrowDown' : way === 'PageUp' ? 'ArrowUp' : way
    while (to !== undefined && this.isDisabled(to)) {
      to = this.lanes.step(again, to, count, 0)
    }
    return to
  }

  /** The key of item `at` in `value`. See `keyField`. */
  private keyAt(at: number): string {
    return keyOf(this.data[at], at, this.keyField)
  }

  /** @internal Every item's key, in the order of the set, which the reorder entry moves. */
  keys(): string[] {
    return this.data.map((_, at) => this.keyAt(at))
  }

  /** The keys chosen now. */
  private get chosen(): Set<string> {
    return new Set(commaList(this.value))
  }

  /**
   * Selects item `at`, or lets it go, asking first. With `extend`, in
   * `multiple`, the items from the anchor to it are taken in, as Data Table
   * and List take in a range. Otherwise the item is where the next range runs
   * from.
   */
  private press(at: number, extend = false, toggle = false): void {
    const mode = this.selectionMode
    if (!mode || at < 0 || at >= this.data.length || this.isDisabled(at)) {
      return
    }
    const key = this.keyAt(at)
    const now = commaList(this.value)
    if (extend && mode === 'multiple') {
      const keys = this.keys()
      const off = this.disabled
      const range = rangeAdd(
        now,
        keys.map((one) => (off.has(one) ? '' : one)),
        anchorAt(keys, this.anchor, at).anchor,
        at,
      )?.filter((one) => one !== '')
      if (range) {
        this.choose(this.inOrder(range))
      }
      return
    }
    this.anchor = key
    /* Under `replace` a press is the item alone, and Control or Command is
       the toggle `toggle` gives every press. */
    if (this.selectionBehavior === 'replace' && !toggle) {
      if (!(now.length === 1 && now[0] === key)) {
        this.choose(key)
      }
      return
    }
    if (mode === 'single') {
      this.choose(now.length === 1 && now[0] === key ? '' : key)
      return
    }
    this.choose(this.inOrder(toggleValue(now, key)))
  }

  /** Keys in the order of the set, a key it no longer holds kept after them. */
  private inOrder(keys: readonly string[]): string {
    return inRowOrder(keys, this.keys()).join(',')
  }

  /** Asks for a new `value`, and says so once it has moved. */
  private choose(next: string): void {
    if (next === this.value) {
      return
    }
    requestValue(this, next, (value) => {
      this.value = value
    })
  }

  /**
   * A press on a row selects it, in a list with `selection-mode`, except on a
   * control of its own. Shift takes in a range.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.selectionMode) {
      return
    }
    const path = event.composedPath()
    const row = path.find((node): node is HTMLElement => this.isRow(node))
    const at = this.indexOf(row ?? null)
    if (at === undefined) {
      return
    }
    /* Narrower than core's: a row's own controls are held at `tabindex="-1"`
       and still count by their tag, and nothing else with a `tabindex` does. */
    if (
      pressedOwnControl(
        event,
        row as HTMLElement,
        'a[href], button, input, select, textarea, label',
      )
    ) {
      return
    }
    this.press(
      at,
      event.shiftKey && this.selectionMode === 'multiple',
      event.ctrlKey || event.metaKey,
    )
  }

  /**
   * @internal Focuses the row for item `index`, scrolling it into view and
   * drawing it first when it is not drawn.
   */
  async focusIndex(index: number): Promise<void> {
    this.active = index
    /* Drawn whether or not the window reaches it. Placed by the estimate, the
       window can stop short of a row once the rows it measured turn out
       shorter: in Chromium, End on 5000 rows of 18px drew 4983 to 4996. */
    this.focusing = index
    this.virtualize.reveal(this.lineOf(index))
    this.virtualize.measure()
    this.requestUpdate()
    try {
      await this.updateComplete
    } finally {
      this.focusing = undefined
    }
    /* Focus scrolls the row the rest of the way: placed by the estimate, a
       measured row can land short of the edge once its real height is known. */
    this.rowFor(index)?.focus()
  }

  /**
   * The row kept for focus is let go once focus has left it.
   *
   * **A task later, and not at once.** Between `focusout` and `focusin` the
   * page's focus is on `<body>`, and Chromium runs microtasks there when a key
   * moves focus. An update asked for here ran in that gap: Tab from a kept row
   * to its own link found no row holding focus, removed the row, and the link
   * went with it, leaving focus on `<body>`. A move to a control inside this
   * list asks for its own update in `handleFocusIn`, so it needs nothing here.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    if (next instanceof Node && this.contains(next)) {
      return
    }
    setTimeout(() => {
      this.requestUpdate()
    }, 0)
  }

  /** A row that takes focus, by a press or by Tab, takes the tab stop with it. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    let node = event.target as Node | null
    while (node && node !== this && !this.isRow(node)) {
      node = node.parentNode
    }
    const index = this.indexOf(node)
    if (index !== undefined) {
      this.active = index
      this.visited = true
    }
    this.requestUpdate()
  }

  /**
   * The item whose row holds focus, where one does.
   *
   * Asked of the root this list is in, which retargets focus inside a row's
   * own shadow root to the row's element.
   */
  private focusedIndex(): number | undefined {
    const root = this.getRootNode() as Document | ShadowRoot
    let node = root.activeElement as Element | null
    while (node && node !== this && !this.isRow(node)) {
      node = node.parentElement
    }
    const index = node instanceof HTMLElement ? node.dataset.index : undefined
    return index === undefined ? undefined : Number(index)
  }

  /** The item a key is moving focus to, drawn until it has it. */
  private focusing: number | undefined

  /** Whether a reader has focused a row, after which their row keeps the tab stop. */
  private visited = false

  /**
   * The item drawn outside the window to keep focus, to take it, or to take
   * it back: the row a reader last focused stays drawn after focus leaves the
   * list, so Shift+Tab returns to it.
   */
  private keptIndex(): number | undefined {
    const index = this.focusing ?? this.focusedIndex() ?? (this.visited ? this.active : undefined)
    const { first, last } = this.itemsOn(this.virtualize.window)
    return index !== undefined && index < this.data.length && (index < first || index >= last)
      ? index
      : undefined
  }

  /**
   * Writes a row's role, and whether it is chosen in a list that selects:
   * `option` with `aria-selected` there, `gridcell` in a grid, and `listitem`
   * otherwise, and `aria-disabled` on an item `disabled-keys` names. Every
   * pass, since a choice changes no row's content.
   *
   * Its place too: `aria-posinset` and `aria-setsize` in a list, and in a
   * grid its column, with the line's `row` given by the slot it is drawn in.
   *
   * `data-selected` and `data-disabled` say the same to a stylesheet, as
   * React Aria's rows do, so one rule reads the same in either kind of list.
   */
  private mark(
    element: Element,
    at: number,
    chosen: ReadonlySet<string>,
    off: ReadonlySet<string>,
  ): void {
    const lined = this.lined
    element.setAttribute('role', this.selectionMode ? 'option' : lined ? 'gridcell' : 'listitem')
    /* In a grid a cell is drawn in its line's slot, which the line's `row`
       holds, so the cell is the row's to a reader and still this list's
       child to a stylesheet. */
    const across = this.across
    const keepSlot = lined && this.virtualize.holdsSlot()
    for (const [name, value] of [
      ['aria-colindex', lined ? (at % across) + 1 : undefined],
      ['aria-posinset', lined ? undefined : at + 1],
      ['aria-setsize', lined ? undefined : this.data.length],
      ['slot', lined && !keepSlot ? `${LINE}${Math.floor(at / across)}` : undefined],
    ] as const) {
      if (name === 'slot' && keepSlot) {
        continue
      }
      if (value === undefined) {
        element.removeAttribute(name)
      } else {
        element.setAttribute(name, String(value))
      }
    }
    const selected = Boolean(this.selectionMode) && chosen.has(this.keyAt(at))
    if (this.selectionMode) {
      element.setAttribute('aria-selected', String(selected))
    } else {
      element.removeAttribute('aria-selected')
    }
    element.toggleAttribute('data-selected', selected)
    const disabled = off.size > 0 && off.has(this.keyAt(at))
    if (disabled) {
      element.setAttribute('aria-disabled', 'true')
    } else {
      element.removeAttribute('aria-disabled')
    }
    element.toggleAttribute('data-disabled', disabled)
  }

  /**
   * Writes which item a row drew, for the controller to measure it against:
   * the real index, the same one `aria-posinset` carries one higher.
   *
   * `mark` writes the place a reader hears from it, the real index and the
   * real total, not the position in the window. A reader arrowing through
   * this should hear where they are in the set.
   */
  private stamp(element: Element, at: number): void {
    element.setAttribute('data-index', String(at))
  }

  /** Fills a drawn row from its item, by `renderItem` or by the template's holes. */
  private fill(elements: Element[], at: number): void {
    const item = this.data[at]
    for (const element of elements) {
      if (this.renderItem) {
        render(this.renderItem(item, at), element as HTMLElement)
      } else {
        fillHoles(element, item)
      }
      this.stamp(element, at)
    }
  }

  /**
   * New elements for item `at`: a `<div>` for `renderItem`, or the template's clone.
   *
   * **Only the template's elements are drawn.** The whitespace around them is
   * text, and `place` takes rows out by their elements, so every text node
   * drawn stayed in the list. Measured on the preview in Chromium: 3,846 nodes
   * after 1,900 rows, and a window move cost 1.9 milliseconds where it had
   * cost 0.34 at the top.
   */
  private draw(template: HTMLTemplateElement | null, at: number): DocumentFragment {
    const fragment = document.createDocumentFragment()
    if (this.renderItem) {
      fragment.append(document.createElement('div'))
    } else if (template) {
      fragment.append(...(template.content.cloneNode(true) as DocumentFragment).children)
    }
    this.fill([...fragment.children], at)
    return fragment
  }

  /**
   * Puts the windowed rows into the light DOM, and takes the rest out.
   *
   * **A row that stays in the window keeps its element.** Clearing and
   * cloning every row on every move replaced the node a reader had focused,
   * so a link in a row lost focus to the body on any scroll, even with its row
   * still on screen. Rows are keyed by item: a row that stays keeps its
   * element, and a row that leaves gives its element to a row that arrives.
   *
   * **A slotted row added or taken out while the box is moving ends the
   * touch on iOS.** Safari reads a change to what a slot holds as a change to
   * the box. The same nodes, filled with the arriving items, leave the slot
   * as it was. Extra nodes stay in the tree hidden until the box is still.
   *
   * **The row holding focus is drawn outside the window too**, beside it on the
   * side it belongs, and the spacer on that side gives up its room.
   *
   * **One row holds the tab stop**, the one the reader last focused, which
   * stays drawn outside the window, and the first row on screen in a list
   * nobody has focused yet. Its own links and buttons are in the tab order,
   * and those of every other row wait.
   */
  private place(): void {
    const template = this.querySelector<HTMLTemplateElement>(':scope > template')
    if (!template && !this.renderItem) {
      return
    }
    const count = this.data.length
    const { first, last } = this.itemsOn(this.virtualize.window)
    /* The row holding focus, so focus can go on to a neighbor if its item has
       left the set. */
    const holding = this.focusedIndex()
    /* A new set has no row a reader left, unless they are in it now. */
    if (this.filledFrom !== this.data && holding === undefined) {
      this.visited = false
    }
    /* Read before anything moves. */
    const onScreen = this.range.first
    /* **The spacers move with the rows, before either is laid out.** Rows
       placed ahead of the render that sizes the spacers left the content the
       wrong length for as long as it took to get there, and anything that read
       layout in between, a row's own controls being found say, had the box
       pull its offset in to the shorter content. At the end of a list with a
       gap, End then came to rest four rows short of the last. The render
       writes the same sizes. */
    if (this.hasUpdated) {
      const spacers = this.spacerSizes()
      const size = this.horizontal ? 'inline-size' : 'block-size'
      this.partNamed<HTMLElement>('before')?.style.setProperty(size, `${spacers.before}px`)
      this.partNamed<HTMLElement>('after')?.style.setProperty(size, `${spacers.after}px`)
    }
    const sections = this.sections
    /* Every row is drawn again into its section when the sections change,
       and out of its place in a waterfall when the list stops being one. */
    const regroup = sections !== this.placedSections || this.waterfall !== this.placedWaterfall
    this.placedSections = sections
    this.placedWaterfall = this.waterfall
    /* A child given a slot of its own, such as `loading`, is the consumer's. */
    const children = [
      ...[...this.children].filter(
        (child): child is HTMLElement =>
          child !== template &&
          child instanceof HTMLElement &&
          child.dataset.virtualPool === undefined &&
          (child.dataset.index !== undefined || !child.hasAttribute('slot')) &&
          !child.hasAttribute('data-section'),
      ),
      ...this.querySelectorAll<HTMLElement>(':scope > [data-section] > [data-index]'),
    ]
    /* Rows cloned from the template are a different tree than rows drawn for
       `renderItem`. A pass that switches starts them from nothing, because
       filling one tree with the other appends. */
    const redraw =
      regroup ||
      (this.drawnBy !== undefined && this.drawnBy !== (this.renderItem ? 'function' : 'template'))
    const plan = drawPlan({
      across: this.across,
      count,
      drawn: children.map((child) => Number(child.dataset.index)),
      first,
      kept: this.keptIndex(),
      last,
      redraw,
    })
    const drawn = new Map<number, Element[]>()
    const reusable: HTMLElement[][] = [...this.pooled]
    this.pooled = []
    const leaving = new Map<number, HTMLElement[]>()
    for (const child of children) {
      const index = Number(child.dataset.index)
      if (plan.remove.has(index)) {
        this.sizes?.unobserve(child)
        leaving.set(index, [...(leaving.get(index) ?? []), child])
        continue
      }
      drawn.set(index, [...(drawn.get(index) ?? []), child])
    }
    if (redraw) {
      for (const group of [...reusable, ...leaving.values()]) {
        this.dropRows(group)
      }
      reusable.length = 0
      leaving.clear()
    } else {
      reusable.push(...leaving.values())
    }
    const refill =
      this.filledFrom !== this.data ||
      this.filledBy !== this.renderItem ||
      this.headedBy !== this.renderSection
    this.filledFrom = this.data
    this.filledBy = this.renderItem
    this.headedBy = this.renderSection
    this.drawnBy = this.renderItem ? 'function' : 'template'
    const groups = this.groups(sections, plan.wanted, regroup, refill)
    /* Rows drawn or filled on this pass, whose controls are new to the tab order. */
    const fresh = new Set<number>()
    /* Where the next new row goes in each parent: before the first row drawn
       after it, or at the end. */
    const anchors = new Map<Element, Element | null>()
    for (const at of plan.wanted) {
      const parent: Element = (sections && groups.get(sectionAt(sections, at))) || this
      if (!anchors.has(parent)) {
        anchors.set(parent, parent.querySelector(':scope > [data-index]'))
      }
      const group = drawn.get(at)
      if (group) {
        if (refill) {
          this.fill(group, at)
          fresh.add(at)
        }
        if (!this.waterfall && this.virtualize.holdsSlot()) {
          for (const element of group) {
            ;(element as HTMLElement).style.order = String(at)
          }
        }
        anchors.set(parent, (group.at(-1) as Element).nextElementSibling)
        continue
      }
      const width = this.renderItem ? 1 : (template?.content.childElementCount ?? 1)
      const recycledAt = reusable.findIndex((one) => one.length === width)
      const recycled = recycledAt === -1 ? undefined : reusable.splice(recycledAt, 1)[0]
      if (recycled) {
        for (const element of recycled) {
          element.hidden = false
          element.removeAttribute('aria-hidden')
          element.removeAttribute('data-virtual-pool')
        }
        this.fill(recycled, at)
        this.watchSize(recycled)
        drawn.set(at, recycled)
        fresh.add(at)
        if (!this.waterfall && this.virtualize.holdsSlot()) {
          for (const element of recycled) {
            element.style.order = String(at)
          }
        }
        if (recycled[0]?.parentElement !== parent || !this.virtualize.holdsSlot()) {
          for (const element of recycled) {
            parent.insertBefore(element, anchors.get(parent) ?? null)
          }
        }
        anchors.set(parent, (recycled.at(-1) as Element).nextElementSibling)
        continue
      }
      /* A new node assigned to the slot ends the touch on iOS. The spacer
         stands in until the box is still. */
      if (this.virtualize.holdsSlot()) {
        continue
      }
      const fragment = this.draw(template, at)
      drawn.set(at, [...fragment.children])
      this.watchSize([...fragment.children])
      fresh.add(at)
      if (!this.waterfall && this.virtualize.holdsSlot()) {
        for (const element of fragment.children) {
          ;(element as HTMLElement).style.order = String(at)
        }
      }
      parent.insertBefore(fragment, anchors.get(parent) ?? null)
    }
    if (this.virtualize.holdsSlot()) {
      for (const group of reusable) {
        this.parkRows(group)
        this.pooled.push(group)
      }
    } else {
      for (const group of reusable) {
        this.dropRows(group)
      }
    }
    this.active = stopAfter(this.active, plan.wanted, {
      count,
      first,
      last,
      onScreen,
    })
    const chosen = this.chosen
    const off = this.disabled
    const lines = this.lined ? [...new Set(plan.wanted.map((at) => this.lineOf(at)))] : []
    /* Named line slots stay put while the box moves. A slot added or taken
       out is a change to what the slot holds, which ends the touch on iOS. */
    if (lines.join() !== this.drawnLines.join() && !this.virtualize.holdsSlot()) {
      /* The render draws a `row` for each, and in `willUpdate` it is the
         render about to run. */
      this.drawnLines = lines
      this.requestUpdate()
    }
    const gap = this.space
    const columns = this.columnCount
    for (const [at, group] of drawn) {
      for (const element of group) {
        this.mark(element, at, chosen, off)
        const style = (element as HTMLElement).style
        if (!this.waterfall && !this.virtualize.holdsSlot()) {
          style.removeProperty('order')
        }
        if (this.waterfall) {
          /* At its column and as far down as the columns place it, the
             width of a column, from the inline start of the set. */
          style.setProperty('position', 'absolute')
          style.setProperty('inset-block-start', `${this.virtualize.offsetOf(at)}px`)
          style.setProperty(
            'inset-inline-start',
            `calc((100% + ${gap}px) * ${this.lanes.lane(at)} / ${columns})`,
          )
          style.setProperty('inline-size', `calc((100% - ${gap * (columns - 1)}px) / ${columns})`)
        } else {
          style.removeProperty('position')
          style.removeProperty('inset-block-start')
          style.removeProperty('inset-inline-start')
          style.removeProperty('inline-size')
        }
      }
      const stop = at === this.active
      group[0]?.setAttribute('tabindex', stop ? '0' : '-1')
      group[0]?.toggleAttribute('data-active', stop)
      if (stop && (fresh.has(at) || this.released !== at)) {
        releaseControls(group)
      } else if (!stop && (fresh.has(at) || this.released === at)) {
        holdControls(group)
      }
    }
    this.released = this.active
    /* **Focus is never left on the page.** The focused item left the set,
       which takes its row with it, and focus went to `<body>`, where the arrow
       keys do nothing. It goes to the item now in its place, or to the last
       item when the set ends before it. A task later, once this update is
       done, since moving focus may draw a row. */
    if (holding !== undefined && plan.remove.has(holding) && count > 0) {
      const next = Math.min(holding, count - 1)
      this.active = next
      setTimeout(() => {
        if (this.focusedIndex() === undefined && this.isConnected) {
          void this.focusIndex(next)
        }
      }, 0)
    }
  }

  /** The sections the rows were last placed in. */
  private placedSections: Sections | undefined

  /** Whether the rows were last placed in a waterfall. */
  private placedWaterfall = false

  /**
   * Row elements taken out of the window while the box is still moving, so
   * the slot keeps the same nodes. Filled again when a row arrives.
   */
  private pooled: HTMLElement[][] = []

  /** Hides a row group that has left the window, and leaves it in the tree. */
  private parkRows(group: HTMLElement[]): void {
    for (const element of group) {
      element.hidden = true
      element.setAttribute('aria-hidden', 'true')
      element.setAttribute('data-virtual-pool', '')
      element.removeAttribute('data-index')
      element.style.removeProperty('order')
    }
  }

  /** Takes a row group out of the tree. */
  private dropRows(group: HTMLElement[]): void {
    for (const element of group) {
      this.sizes?.unobserve(element)
      element.remove()
    }
  }

  /** The lines of a grid drawn on the last pass, each a `row` the render draws a slot in. */
  private drawnLines: number[] = []

  /** The function the drawn headers were drawn by, so a new one draws them again. */
  private headedBy: VirtualListSectionRenderer | undefined

  /** Ties each header's id to this list. */
  private readonly sectionId = nextSectionId()

  /**
   * The section elements a pass draws rows into, by section, for the
   * sections of the wanted items: each a `group` named by its header, which
   * is its first child. The ones no wanted item is in leave, and all of them
   * do when the sections change.
   */
  private groups(
    sections: Sections | undefined,
    wanted: readonly number[],
    regroup: boolean,
    refill: boolean,
  ): Map<number, HTMLElement> {
    const keep = new Set(sections ? wanted.map((at) => sectionAt(sections, at)) : [])
    const groups = new Map<number, HTMLElement>()
    for (const group of this.querySelectorAll<HTMLElement>(':scope > [data-section]')) {
      const at = Number(group.dataset.section)
      if (regroup || !keep.has(at)) {
        this.sizes?.unobserve(group.firstElementChild as Element)
        group.remove()
      } else {
        groups.set(at, group)
      }
    }
    if (!sections) {
      return groups
    }
    for (const at of [...keep].sort((a, b) => a - b)) {
      let group = groups.get(at)
      const fresh = group === undefined
      if (!group) {
        group = document.createElement('div')
        const header = document.createElement('div')
        header.id = `${this.sectionId}-${at}`
        header.dataset.entry = String(headOf(sections, at))
        header.setAttribute('data-header', '')
        group.dataset.section = String(at)
        group.setAttribute('role', 'group')
        group.setAttribute('aria-labelledby', header.id)
        group.append(header)
        /* Before the next section drawn, so the sections stay in order. */
        const after = [...groups].find(([other]) => other > at)?.[1] ?? null
        this.insertBefore(group, after)
        groups.set(at, group)
        this.watchSize([header])
      }
      const header = group.firstElementChild as HTMLElement
      if (fresh || refill) {
        const name = sections.names[at] ?? ''
        if (this.renderSection) {
          render(this.renderSection(name, at), header)
        } else {
          header.textContent = name
        }
      }
      /* A list box's group holds options and a header that is no option. */
      if (this.selectionMode) {
        header.setAttribute('role', 'presentation')
      } else {
        header.removeAttribute('role')
      }
      const gap = this.space
      group.style.cssText = this.horizontal
        ? `display: flex; column-gap: ${gap}px`
        : gap === 0
          ? ''
          : `display: flex; flex-direction: column; row-gap: ${gap}px`
    }
    return groups
  }

  /**
   * The spacers' sizes: the window's, with the line kept for focus taking its
   * own room, and so do the headers drawn with their sections from outside it.
   */
  private spacerSizes(): { after: number; before: number } {
    /* A waterfall's items stand where the columns put them, in a box as long
       as the set, so nothing stands in for the others. */
    if (this.waterfall) {
      return { after: 0, before: 0 }
    }
    const kept = this.hasUpdated ? this.keptIndex() : undefined
    const room = this.virtualize.spacers(kept === undefined ? undefined : this.lineOf(kept))
    const sections = this.sections
    if (!sections || !this.hasUpdated) {
      return room
    }
    const { first, last } = this.virtualize.window
    const items = this.itemsOn(this.virtualize.window)
    const drawnIn = new Set<number>()
    if (items.last > items.first) {
      drawnIn.add(sectionAt(sections, items.first))
    }
    if (kept !== undefined) {
      drawnIn.add(sectionAt(sections, kept))
    }
    let { after, before } = room
    for (const section of drawnIn) {
      const head = headOf(sections, section)
      if (head < first) {
        before = Math.max(0, before - this.virtualize.sizeOf(head))
      } else if (head >= last) {
        after = Math.max(0, after - this.virtualize.sizeOf(head))
      }
    }
    return { after, before }
  }

  protected override render(): TemplateResult {
    const { after, before } = this.spacerSizes()
    const across = this.across
    const horizontal = this.horizontal
    const size = horizontal ? 'inline-size' : 'block-size'
    const flex = horizontal ? '; flex: none' : ''
    const gap = this.space
    const grid = gap === 0 ? '' : `; gap: ${gap}px; padding-block-end: ${gap}px`
    /* Only once the browser has read the source, so a server and a list whose
       items are on their way say nothing about an empty set. `readFor` is set
       by the read in `willUpdate`, so the first render after it draws the row;
       `hasUpdated` waited for a second render that a browser never asks for. */
    const empty =
      this.readFor !== undefined &&
      !this.loading &&
      this.data.length === 0 &&
      ((this.emptyLabel ?? this.emptyText) !== '' ||
        this.querySelector(':scope > [slot="empty"]') !== null)
    const lined = this.lined
    /* A row of a list, or in a grid a line of one cell, for the two rows that
       are not items. */
    const own = (content: TemplateResult): TemplateResult =>
      lined ? html`<div role="gridcell">${content}</div>` : content
    const role = this.selectionMode ? 'option' : lined ? 'row' : 'listitem'
    return html`<div
      data-scroller
      part="viewport"
      role=${this.selectionMode ? 'listbox' : lined ? 'grid' : 'list'}
      aria-colcount=${lined ? across : nothing}
      aria-rowcount=${lined ? Math.ceil(this.data.length / across) : nothing}
      aria-multiselectable=${this.selectionMode === 'multiple' ? 'true' : nothing}
      aria-busy=${this.loading ? 'true' : nothing}
      aria-label=${this.label}
      aria-orientation=${this.selectionMode && horizontal ? 'horizontal' : nothing}
      style=${horizontal ? 'display: flex' : nothing}
      @scroll=${() => {
        this.virtualize.measure()
        this.report()
      }}
    >
      <div part="before" style="${size}: ${before}px${flex}"></div>
      ${
        /* A grid a reader reads draws a `row` for each line drawn, around the
           slot its cells are drawn in. Each row is a subgrid of the columns,
           so a line is as tall as its tallest cell, as before. */
        lined
          ? html`<div style=${`display: grid; grid-template-columns: repeat(${across}, minmax(0, 1fr))${grid}`}>
              ${this.drawnLines.map(
                (line) => html`<div
                  aria-rowindex=${line + 1}
                  role="row"
                  style="display: grid; grid-column: 1 / -1; grid-template-columns: subgrid"
                >
                  <slot name=${`${LINE}${line}`}></slot>
                </div>`,
              )}
            </div>`
          : nothing
      }
      <slot
        style=${
          /* A gap after the last drawn row as well, which the spacer below
             counts as part of the row before it. A waterfall is as long as
             its longest column, and its items stand in it where the columns
             put them. */
          this.waterfall
            ? `display: block; position: relative; block-size: ${this.virtualize.offsetOf(this.data.length)}px`
            : horizontal
              ? `display: flex; flex: none${
                  gap === 0 ? '' : `; column-gap: ${gap}px; padding-inline-end: ${gap}px`
                }`
              : across === 1 || lined
                ? gap === 0
                  ? nothing
                  : `display: flex; flex-direction: column; row-gap: ${gap}px; padding-block-end: ${gap}px`
                : `display: grid; grid-template-columns: repeat(${across}, minmax(0, 1fr))${grid}`
        }
      ></slot>
      <div part="after" style="${size}: ${after}px${flex}"></div>
      ${
        /* An item of the list that is not one of the set, so it carries no
           place in it, as React Aria's loading row does. */
        this.loading
          ? html`<div part="loading" role=${role}>
              ${own(html`<slot name="loading">${this.loadingLabel ?? this.loadingText}</slot>`)}
            </div>`
          : nothing
      }
      ${
        empty
          ? html`<div part="empty" role=${role}>
              ${own(html`<slot name="empty">${this.emptyLabel ?? this.emptyText}</slot>`)}
            </div>`
          : nothing
      }
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-virtual-list': HelixHeadlessVirtualList
  }
}
