import {
  commaList,
  customElement,
  HelixActionEvent,
  HelixBeforeChangeEvent,
  HelixElement,
  hostAria,
  inlineStep,
  KeyboardNavigationController,
  type NavigableItem,
  requestChange,
  rovingStop,
  typeaheadBy,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessListItem } from '../item/list-item.js'
import { numbering } from '../numbering.js'
import {
  choiceValue,
  type ListSelectionBehavior,
  type ListSelectionMode,
  pageReach,
  rowStop,
} from '../selection.js'

/** What inside a row takes a press of its own, so the row does not. */
const PRESSABLE = 'a[href], button, input, label, select, textarea, [tabindex]'

/**
 * @summary A set of rows, announced as a list.
 *
 * @description
 * Sets `role="list"` on the host, so a screen reader counts the rows and
 * announces each one's position, such as "1 of 7".
 *
 * **`selection-mode` makes the list interactive**, in the way of a grid list:
 * a grid of rows that is one tab stop. `single` selects one row at a time and
 * `multiple` any number, and `value` holds the selected rows' values,
 * separated by commas. A change asks with `helix-before-change` and tells
 * with `change`. `none` selects nothing, so a press acts on the row. A
 * `disabled` row is passed over. Each row is named by its label and described
 * by its description, so the words of the controls in `end` are not read as
 * part of its name.
 *
 * `selection-behavior` says what a press does to the rows already selected.
 * `toggle`, the default, adds or takes out the row. `replace` selects the row
 * alone, as a file list does, and the arrow keys carry the selection with
 * them. Control or Command with a press then adds or takes out one row.
 *
 * | Key | What it does |
 * |---|---|
 * | Down, Up | Moves to the next or the previous row. Under `replace`, selects it. |
 * | Home, End | Moves to the first or the last row. Under `replace`, selects it. |
 * | Page Down, Page Up | Moves a box's height of rows, so the row at one edge lands at the other. Under `replace`, selects the row it lands on. |
 * | A letter or a word | Moves to the next row whose words start with what you typed. |
 * | Left, Right | Moves between the row and the controls in its `end` slot. |
 * | Space | Selects the row, or lets it go. |
 * | Shift with Down, Up, Home, End, Page Down, Page Up or Space | Selects every row from the last one pressed, in `multiple`. |
 * | Control or Command with Down, Up, Home, End, Page Down or Page Up | Moves without selecting, under `replace`. |
 * | Control or Command with A | Selects every row, in `multiple`. |
 * | Escape | Lets go of every selected row, asking first, and keeps the key from the dialog or menu around the list. With nothing selected, the key goes on to them. |
 * | Enter | Acts on the row: follows its link, or sends `helix-action` from it. |
 *
 * A press with Shift selects every row from the last one pressed, and a press
 * with Control or Command adds or takes out one row under `replace`.
 *
 * **Leave `selection-mode` unset for a list a reader reads**, and set it for
 * one a reader chooses from or acts on. The rows of an interactive list are
 * grid rows, which hold controls as a list box option cannot. Give a control
 * in `end` `tabindex="-1"` to leave it to the arrow keys and out of the tab
 * order.
 *
 * `start` and `reversed` number an ordered list as `<ol>` does. The list
 * writes where the numbers start and which way they run as `--list-first` and
 * `--list-step` on its slot, which the styled tier counts from. Reversed with
 * no `start` counts down from the number of rows, which a server cannot know,
 * so served markup counts from one until the list runs.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Rows, Stack, Menu
 * @documentation https://fusion.dev/helix/components/list
 *
 * @slot - The rows.
 *
 * @event {Event} change - Fired once a press has changed which rows are selected.
 * @event {HelixActionEvent} helix-action - Sent from a row when the reader acts on it: Enter, or a press in a list that selects nothing. Read the row from `target`. A row with `href` follows its link instead.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before a press changes which rows are selected, with the `value` it would leave. Cancelable.
 *
 * @cssproperty --list-first - The number of the first row, written where `start` or `reversed` moves it.
 * @cssproperty --list-step - What each row adds to the number before it: `1`, or `-1` where `reversed`.
 */
@customElement('helix-headless-list')
export class HelixHeadlessList extends HelixElement {
  /**
   * The kind of list, which follows from the content.
   *
   * On the headless tier because it is meaning rather than decoration, the same
   * argument `severity` makes on `Callout`. A numbered list is numbered because
   * the order carries information; a bulleted one is bulleted because the items
   * are a set and the order does not. That distinction is the reader's, and it
   * has to survive with the stylesheet turned off.
   *
   * - `default` is a run of rows and takes no marker. It is what a list of
   *   settings or files is: neither ordered nor a set to be counted.
   * - `ordered` numbers them, for steps.
   * - `unordered` bullets them, for a set.
   * - `description` pairs each row's label with its supporting text as a term
   *   and what the term means.
   *
   * **`description` reuses the row's existing slots rather than inventing a
   *   second kind of row.** A term and its description is exactly the label and
   *   the supporting text `List.Item` already has, so the kind changes how the
   *   pair is drawn and nothing about what a consumer writes. A separate
   *   `List.Term` element would be a second row shape for one attribute's sake.
   */
  @property({ reflect: true })
  kind?: 'default' | 'description' | 'ordered' | 'unordered'

  /**
   * The list's name, read by screen readers.
   */
  @property()
  label = ''

  /**
   * Numbers an ordered list downward, so the count falls row by row and ends at
   * its last row, as `<ol reversed>` does.
   */
  @property({ type: Boolean })
  reversed = false

  /**
   * What a press does to the rows already selected, in a list that selects:
   * `toggle` adds or takes out the row, and `replace` selects it alone and
   * lets the arrow keys carry the selection.
   */
  @property({ attribute: 'selection-behavior' })
  selectionBehavior: ListSelectionBehavior = 'toggle'

  /**
   * Makes the list interactive: `single` selects one row, `multiple` any
   * number, and `none` moves and acts without selecting. Unset is a list a
   * reader reads, with no tab stop of its own.
   */
  @property({ attribute: 'selection-mode' })
  selectionMode?: ListSelectionMode

  /**
   * The number of an ordered list's first row, as `<ol start>` is. Unset counts
   * from one, or down from the number of rows where `reversed`.
   */
  @property({ type: Number })
  start?: number

  /**
   * The markers an ordered list draws. It takes the five values of `<ol type>`.
   *
   * Reflected, because this is one of the things a stylesheet selects on, each
   * value mapping to a `list-style-type`. The platform's spellings rather than
   * the CSS ones, so `<helix-headless-list kind="ordered" type="i">` is what a
   * consumer would have written on an `<ol>`.
   *
   * `type` is only `list-style-type`. `start` and `reversed` move the count
   * itself.
   */
  @property({ reflect: true })
  type?: '1' | 'a' | 'A' | 'i' | 'I'

  /**
   * The selected rows' values, separated by commas, in a list that selects.
   *
   * Set it to start with rows selected. A row's value is its `value`, or its
   * words where it has none.
   */
  @property()
  value = ''

  /** The row the reader was last on, which keeps the tab stop. */
  private last: HelixHeadlessListItem | undefined

  /** The value of the row a Shift range runs from: the last row pressed. */
  private anchor: string | undefined

  /**
   * Shift and Control or Command on the key that is moving focus, read when
   * focus arrives on a row and cleared once the key has been answered.
   */
  private moving: { extend: boolean; toggle: boolean } | undefined

  /**
   * Up, Down, Home, End and typed letters, moving focus and choosing nothing,
   * from the focused row and without wrapping. Left and Right are the row's.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.reachable.map((row) => this.navigable(row)),
    origin: 'focus',
    reserved: () => ['ArrowLeft', 'ArrowRight'],
    selects: () => false,
    typeahead: typeaheadBy((item) => (item as NavigableItem & { words: string }).words),
    wrap: false,
  })

  /** Whether the list is a grid a reader moves through. */
  private get interactive(): boolean {
    return this.selectionMode !== undefined
  }

  /** The rows the list holds, in order. */
  get rows(): HelixHeadlessListItem[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessListItem => child instanceof HelixHeadlessListItem,
    )
  }

  /** The rows a key can land on, in an interactive list. */
  private get reachable(): HelixHeadlessListItem[] {
    return this.interactive ? this.rows.filter((row) => !row.disabled) : []
  }

  /** A row as the keyboard controller sees it: an item it moves focus to and never chooses. */
  private navigable(row: HelixHeadlessListItem): NavigableItem & { words: string } {
    return {
      contains: (node) => row.contains(node),
      disabled: row.disabled,
      focusItem: () => row.focusItem(),
      select: () => {},
      selected: false,
      words: row.words,
    }
  }

  /** What a row stands for in `value`: its own `value`, or its words. */
  private valueFor(row: HelixHeadlessListItem): string {
    return row.value || row.words
  }

  /**
   * Tells every row its place: whether it holds the one tab stop and whether
   * it is selected, or that it is a plain row. Through `whenHydrated`, so a
   * row a server rendered draws its served markup first.
   */
  private sync(): void {
    const mode = this.selectionMode
    const chosen = new Set(commaList(this.value))
    const rows = this.rows
    const holder = mode
      ? rovingStop(rows, this.last, {
          disabled: (row) => row.disabled,
          selected: (row) => chosen.has(this.valueFor(row)),
        })
      : undefined
    for (const row of rows) {
      whenHydrated(row, () => {
        row.focusable = mode ? row === holder : undefined
        row.selected =
          mode === undefined || mode === 'none' ? undefined : chosen.has(this.valueFor(row))
      })
    }
  }

  /** The row a press or a key came from, read off the event's path. */
  private rowOf(event: Event): HelixHeadlessListItem | undefined {
    return event
      .composedPath()
      .find(
        (node): node is HelixHeadlessListItem =>
          node instanceof HelixHeadlessListItem && node.parentElement === this,
      )
  }

  /**
   * Selects what a press or a key leaves, asking first. `helix-before-change`
   * carries the `value` it would leave, and `change` follows once it has moved.
   */
  private choose(next: string | null): void {
    if (next === null) {
      return
    }
    requestChange({
      apply: (value) => {
        this.value = value
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      },
      event: (value) => new HelixBeforeChangeEvent({ value }),
      host: this,
      next,
    })
  }

  /** What `choiceValue` needs of this list for a row. */
  private choice(row: HelixHeadlessListItem, extend: boolean, toggle: boolean, arrived: boolean) {
    return {
      anchor: this.anchor,
      arrived,
      behavior: this.selectionBehavior,
      extend,
      mode: this.selectionMode ?? 'none',
      pressed: this.valueFor(row),
      shown: this.reachable.map((one) => this.valueFor(one)),
      toggle,
      value: this.value,
    }
  }

  /**
   * Selects the row, or lets it go, by `selection-behavior`: Shift takes in
   * the rows from the last one pressed, and Control or Command toggles one row
   * under `replace`. The row is where the next range runs from.
   */
  protected press(row: HelixHeadlessListItem, extend = false, toggle = false): void {
    const mode = this.selectionMode
    if (mode === undefined || mode === 'none' || row.disabled) {
      return
    }
    const next = choiceValue(this.choice(row, extend, toggle, false))
    if (!extend) {
      this.anchor = this.valueFor(row)
    }
    this.choose(next)
  }

  /**
   * A key moved focus onto the row: under `replace` it is selected alone, and
   * with Shift the rows from the anchor are taken in, from `from` where
   * nothing was pressed yet.
   */
  private arrive(row: HelixHeadlessListItem, from: HelixHeadlessListItem | undefined): void {
    const moving = this.moving
    if (!moving || this.selectionMode === undefined || this.selectionMode === 'none') {
      return
    }
    if (moving.extend && this.anchor === undefined && from) {
      this.anchor = this.valueFor(from)
    }
    const next = choiceValue(this.choice(row, moving.extend, moving.toggle, true))
    if (!moving.extend && next !== null) {
      this.anchor = this.valueFor(row)
    }
    this.choose(next)
  }

  /**
   * Page Down or Page Up from the row: focus moves a box's height of rows, the
   * list's own where it scrolls and the window's where it does not, and lands
   * the way an arrow does, so `replace` and Shift choose as they do there.
   */
  private page(row: HelixHeadlessListItem, step: -1 | 1): void {
    const rows = this.reachable
    const edges = rows.map((one) => {
      const box = one.getBoundingClientRect()
      return { bottom: box.bottom, top: box.top }
    })
    const room = this.scrollHeight > this.clientHeight + 1 ? this.clientHeight : window.innerHeight
    const target = rows[pageReach(edges, rows.indexOf(row), room, step)]
    if (target && target !== row) {
      target.focusItem()
    }
  }

  /** Acts on the row: follows its link, or says it was acted on. */
  protected act(row: HelixHeadlessListItem): void {
    if (row.disabled) {
      return
    }
    if (row.href !== '') {
      row.follow()
      return
    }
    row.dispatchEvent(new HelixActionEvent())
  }

  /** Left and Right inside a row: the cell, then each control in `end`, and back. */
  private moveInRow(row: HelixHeadlessListItem, event: KeyboardEvent): void {
    const step = inlineStep(this, event.key)
    const cell = row.cell
    if (step === 0 || !cell) {
      return
    }
    const stops = [cell, ...row.controls]
    /* The innermost stop on the path: a control in `end` sits inside the cell,
       so the cell is on a control's path too. */
    const on = event.composedPath().find((node) => stops.includes(node as HTMLElement))
    const at = Math.max(0, stops.indexOf(on as HTMLElement))
    event.preventDefault()
    stops[rowStop(stops.length, at, step)]?.focus()
  }

  /**
   * Notes the modifiers of a key before the keyboard controller moves focus
   * with it, which happens first, in the same dispatch.
   */
  private readonly handleKeyCapture = (event: KeyboardEvent): void => {
    this.moving = { extend: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const row = this.interactive ? this.rowOf(event) : undefined
    if (row && !row.disabled && !event.altKey && /^Page(Down|Up)$/.test(event.key)) {
      /* Before the modifiers are spent, so the row focus lands on reads them. */
      event.preventDefault()
      this.page(row, event.key === 'PageDown' ? 1 : -1)
    }
    /* Focus has arrived wherever this key sent it, so what it carried is spent. */
    this.moving = undefined
    if (!row || row.disabled || event.altKey) {
      return
    }
    const toggle = event.ctrlKey || event.metaKey
    if (!toggle && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      this.moveInRow(row, event)
      return
    }
    /* Only from the cell: Space and Enter on a control in the row are that
       control's. */
    if (event.composedPath()[0] !== row.cell) {
      return
    }
    if (toggle && event.key.toLowerCase() === 'a' && this.selectionMode === 'multiple') {
      event.preventDefault()
      const every = this.reachable.map((one) => this.valueFor(one)).join(', ')
      this.choose(every === this.value ? null : every)
    } else if (event.key === 'Escape' && this.value !== '' && this.selectionMode !== 'none') {
      /* React Aria's GridList clears on Escape too, and keeps the key from
         closing what holds the list only where there was something to clear. */
      event.preventDefault()
      event.stopPropagation()
      this.choose('')
    } else if (event.key === 'Enter' && !toggle) {
      event.preventDefault()
      this.act(row)
    } else if (event.key === ' ' && !event.defaultPrevented) {
      /* A Space the typeahead took as part of a word is not a press. */
      event.preventDefault()
      this.press(row, event.shiftKey, toggle)
    }
  }

  /* A press on the row selects it, or acts on it in a list that selects
     nothing, except on its link or a control in it, which are presses on
     something else. */
  private readonly handleClick = (event: MouseEvent): void => {
    const row = this.interactive ? this.rowOf(event) : undefined
    if (!row) {
      return
    }
    /* What was pressed inside the row, before its cell, or before the row
       itself where a slotted control's path does not pass the cell. */
    const path = event.composedPath()
    const cell = row.cell
    const end = cell && path.includes(cell) ? path.indexOf(cell) : path.indexOf(row)
    const inner = path.slice(0, Math.max(0, end))
    if (inner.some((node) => node instanceof HTMLElement && node.matches(PRESSABLE))) {
      return
    }
    if (this.selectionMode === 'none') {
      this.act(row)
    } else {
      this.press(row, event.shiftKey, event.ctrlKey || event.metaKey)
    }
  }

  /* Wherever the reader lands, by key or by pointer, holds the stop next. */
  private readonly handleFocusin = (event: FocusEvent): void => {
    const row = this.interactive ? this.rowOf(event) : undefined
    if (row && row !== this.last) {
      const from = this.last
      this.last = row
      if (event.composedPath()[0] === row.cell) {
        this.arrive(row, from)
      }
      this.sync()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeyCapture, true)
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('click', this.handleClick)
    this.addEventListener('focusin', this.handleFocusin)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeyCapture, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('click', this.handleClick)
    this.removeEventListener('focusin', this.handleFocusin)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (this.interactive || changed.get('selectionMode') !== undefined) {
      this.sync()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: this.interactive ? 'grid' : 'list' })
    this.internals.ariaMultiSelectable = this.selectionMode === 'multiple' ? 'true' : null
    /* `role="list"` at every kind, including `description`. A description list
       has its own native role, but this renders divs rather than `<dl>`, and
       claiming `term`/`definition` without the owning `list` those roles
       require is worse than a plain list: an invented role that resolves to
       nothing tells a reader less than an honest generic one. The pairing is
       carried by the markup being a label and its supporting text, which is
       what it already was. */
  }

  /**
   * Where the numbers start and which way they run, as custom properties on
   * the slot the rows inherit from, or nothing where they count up from one.
   */
  private get numbers(): string | typeof nothing {
    const counted = numbering(
      this.start,
      this.reversed,
      this.childrenKnown ? this.knownChildren.length : undefined,
    )
    return counted ? `--list-first: ${counted.first}; --list-step: ${counted.step}` : nothing
  }

  protected override render(): TemplateResult {
    /* A row arriving or leaving changes who holds the stop and how many rows
       a reversed list counts down from. */
    return html`<slot style=${this.numbers} @slotchange=${this.handleSlotChange}></slot>`
  }

  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-list': HelixHeadlessList
  }
}
