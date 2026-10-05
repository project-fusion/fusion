import {
  AriaForwardController,
  CopyController,
  countLabel,
  customElement,
  drawStatus,
  elementById,
  fillTemplate,
  formatNumbers,
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixElement,
  HelixFilterEvent,
  HelixFilteredEvent,
  inlineStep,
  requestChange,
  StatusController,
  scrollItemIntoView,
  searchableById,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { caretDown, caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html as staticHtml } from 'lit/static-html.js'
import '../../copy-button/index.js'
import { ancestorsOf, entries, flatten, type Row, search, seed } from '../rows.js'

/**
 * @summary A structured value shown as a tree, where you can close branches,
 * see how many entries each holds, and copy any part.
 *
 * @description
 * Object Inspector shows a structured value, such as an API response, a config,
 * or a raw record, as a read-only tree with each entry's type visible.
 *
 * Pass the object to `value`, or name a `<script type="application/json">` by
 * id with `for`, the same source `VirtualList` and the charts read. JSON text
 * works with server rendering and with React hydration, which skips object
 * properties. `value` wins when both are set.
 *
 * The tree is one tab stop. Up and Down move between rows, Right opens a branch
 * or moves into it, Left closes it or moves to its parent, and Home and End
 * move to the first and last rows. Typing moves to the next row whose key
 * starts with what was typed, and `*` opens every branch beside the active
 * row. Focus stays on the tree, and `aria-activedescendant` marks the active
 * row. Each row carries its real level, position, and set size, including in
 * a windowed tree.
 *
 * `active` is the active row's path, written the way a JSON Pointer writes it:
 * the empty string for the root and `/meta/tags/0` for an entry under it.
 * Moving to another row sends `helix-before-activate`, which you can cancel,
 * and then `helix-activate`, both with the path. Writing `active` moves there
 * and opens the branches around it, and sends nothing. `expanded` holds the
 * open branches by path, and writing it opens those and closes the rest. A row
 * that closes around the active one hands it to the nearest open branch.
 *
 * `filter` narrows the tree to the entries whose key or value holds the text,
 * ignoring case, and the branches that lead to them, which it opens. A matched
 * branch keeps everything under it. Each matched row carries `row-match`, and
 * a screen reader hears how many entries matched from `result-label` and
 * `results-label`. `filterable` adds a field that sets it: typing sends
 * `helix-filter`, which you can cancel, and then `helix-filtered`, and Down
 * moves from the field to the tree.
 *
 * A new `value` keeps the branches a reader opened or closed, and the active
 * row, where the new value still has them. A branch the old value did not have
 * opens to `default-depth`.
 *
 * The copy button copies the active row, a branch as JSON and a string as its
 * text. So do Command+C and Control+C while the tree has focus and no text is
 * selected. The button sits beside the tree, because assistive technology
 * cannot reliably reach a button inside a tree item.
 *
 * `windowed` draws only the rows in view, for values with thousands of entries.
 * The box needs a height for windowing to work. The styled tier sets one, and
 * in the headless tier you set it yourself.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases JSON viewer, Object viewer, Inspector, Data explorer
 * @documentation https://fusion.dev/helix/components/object-inspector
 *
 * @event {HelixActivateEvent} helix-activate - The active row moved, by a key or a click. The detail's `value` is its path.
 * @event {HelixBeforeActivateEvent} helix-before-activate - The active row is about to move, with its new path. Cancelable: cancel it to keep the row where it is.
 * @event {HelixCopyEvent} helix-copy - A value was put on the clipboard, from the copy button or the keyboard.
 * @event {HelixFilterEvent} helix-filter - Text was typed in the filter field, with what it now holds. Cancelable: cancel it to keep the filter as it was.
 * @event {HelixFilteredEvent} helix-filtered - The filter field changed `filter`, which now holds the text.
 *
 * @csspart after - The space the rows below the drawn rows would take, when `windowed` is set.
 * @csspart before - The space the rows above the drawn rows would take, when `windowed` is set.
 * @csspart boolean - A `true` or `false`.
 * @csspart copy - The copy button, which copies the active row.
 * @csspart copy-button - The button inside the copy control.
 * @csspart copy-live - The live region inside the copy button, which says its `pending-label` when the copy becomes pending under focus.
 * @csspart copy-mark - The clipboard icon, and the confirmation icon that replaces it.
 * @csspart copy-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart copy-tooltip - The tooltip, forwarded from the copy button's tooltip.
 * @csspart copy-tooltip-arrow - The tooltip's arrow, pointing at the copy button.
 * @csspart copy-tooltip-arrow-bottom - The arrow while the tooltip is below the copy button, on the tooltip's top edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-left - The arrow while the tooltip is left of the copy button, on the tooltip's right edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-right - The arrow while the tooltip is right of the copy button, on the tooltip's left edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-arrow-top - The arrow while the tooltip is above the copy button, on the tooltip's bottom edge. Set alongside `copy-tooltip-arrow`.
 * @csspart copy-tooltip-bottom - The tooltip while it is below the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-left - The tooltip while it is left of the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-right - The tooltip while it is right of the copy button. Set alongside `copy-tooltip`.
 * @csspart copy-tooltip-top - The tooltip while it is above the copy button. Set alongside `copy-tooltip`.
 * @csspart count - The number of entries a branch holds.
 * @csspart frame - The tree and the copy button beside it.
 * @csspart header - The bar that holds the label, when there is one.
 * @csspart key - A property name or an array index.
 * @csspart label - The label.
 * @csspart live - How many entries a filter matched, in a region that screen readers announce when it changes. Drawn from the first filter on. Visually hidden in the styled tier.
 * @csspart null - A `null`.
 * @csspart number - A number.
 * @csspart row - One entry, as a tree item.
 * @csspart row-active - The entry the keyboard is on. Set alongside `row`.
 * @csspart row-match - An entry whose key or value holds the filter. Set alongside `row`.
 * @csspart search-field - The field that sets `filter`, with `filterable`.
 * @csspart string - A string, in quotes.
 * @csspart summary - The brackets that stand for a branch's contents.
 * @csspart toggle - The caret on a branch. It points down when the branch is open and sideways when it is closed.
 * @csspart tree - The tree, which is the element that receives focus.
 *
 * @cssproperty --object-inspector-level - How deep a row is, from 0 at the root, for indenting it.
 */
@customElement('helix-headless-object-inspector')
export class HelixHeadlessObjectInspector extends HelixElement {
  /**
   * The active row's path, such as `/meta/tags/0`, and the empty string for the
   * root.
   *
   * Reading gives the row the keys are on. Writing moves there, opening the
   * branches around it, and sends no event, the way a script's write to any
   * current value sends none. A path the value does not hold moves to the
   * nearest branch above it that it does.
   */
  @property()
  get active(): string {
    return this.wanted ?? this.rows[this.cursor]?.path ?? ''
  }

  set active(path: string) {
    const previous = this.active
    this.wanted = path
    this.requestUpdate('active', previous)
  }

  /**
   * The copy button's accessible name on a row with a key, with the key filled
   * in as `{name}`.
   *
   * **Every word the inspector speaks is a property**, so a page in another
   * language hears its own rather than English around its own keys.
   */
  @property({ attribute: 'copy-label' })
  copyLabel = 'Copy {name}'

  /** The copy button's accessible name on a row without a key, such as the root. */
  @property({ attribute: 'copy-value-label' })
  copyValueLabel = 'Copy value'

  /**
   * How many levels start open.
   *
   * One by default: the root is open and everything under it closed, so a
   * reader sees the shape of the value before its contents. `0` starts with the
   * root closed; a large number opens everything, which on a big value is the
   * wall of text this exists to avoid.
   */
  @property({ attribute: 'default-depth', type: Number })
  defaultDepth = 1

  /**
   * The open branches, by path, in no set order.
   *
   * Writing opens exactly these and closes every other, keeping the active row
   * where it stays visible. A property, never an attribute.
   */
  @property({ attribute: false })
  get expanded(): string[] {
    return [...this.opened]
  }

  set expanded(paths: string[]) {
    const previous = this.expanded
    this.declared = new Set(paths)
    this.opened = this.declared
    this.requestUpdate('expanded', previous)
  }

  /**
   * Text the tree is narrowed to: the entries whose key or value holds it,
   * ignoring case, and the branches that lead to them. Empty shows everything.
   */
  @property()
  filter = ''

  /** Whether to show a field that sets `filter`. */
  @property({ type: Boolean })
  filterable = false

  /** The filter field's placeholder and accessible name. */
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /**
   * The id of a `<script type="application/json">` holding the value.
   *
   * Read once the document exists, and again whenever this changes. Text that
   * does not parse leaves the inspector empty rather than throwing, since a
   * page's markup should not take the page down over a comma.
   */
  @property()
  for = ''

  /** How an array of one entry counts it. `{count}` is replaced with the count. */
  @property({ attribute: 'item-label' })
  itemLabel = '{count} item'

  /** How an array of any other number of entries counts them. `{count}` is replaced with the count. */
  @property({ attribute: 'items-label' })
  itemsLabel = '{count} items'

  /** How an object of one key counts it. `{count}` is replaced with the count. */
  @property({ attribute: 'key-label' })
  keyLabel = '{count} key'

  /** How an object of any other number of keys counts them. `{count}` is replaced with the count. */
  @property({ attribute: 'keys-label' })
  keysLabel = '{count} keys'

  /**
   * Accessible name for the tree, and the text of the header where there is one.
   */
  @property()
  label = ''

  /**
   * Hides the copy button.
   *
   * Negative for the reason Code Block's is: a boolean attribute defaulting to
   * true could never be turned off from markup.
   *
   * **It does not reflect, where Code Block's does**, and the difference is what
   * the two sheets need. Code Block reserves the button's width with
   * `:host(:not([no-copy]))`, so the attribute has to be there for a consumer
   * who set the property. This button is positioned out of the flow and takes no
   * room, so nothing selects on it, and reflection exists so that a selector can
   * reach a value.
   */
  @property({ attribute: 'no-copy', type: Boolean })
  noCopy = false

  /** What a screen reader hears when a filter matches one entry. `{count}` is the count. */
  @property({ attribute: 'result-label' })
  resultLabel = '{count} result'

  /**
   * What a screen reader hears when a filter matches any other number of
   * entries. `{count}` is the count. The two are chosen by `Intl.PluralRules`.
   */
  @property({ attribute: 'results-label' })
  resultsLabel = '{count} results'

  /**
   * The tree's accessible name when `label` is empty and the host names it
   * with neither `aria-label` nor `aria-labelledby`.
   */
  @property({ attribute: 'tree-label' })
  treeLabel = 'Value'

  /**
   * The value to show, when your code already holds it as an object.
   *
   * Takes precedence over `for`. Anything JSON can say is drawn; anything else
   * is shown as its string.
   */
  @property({ attribute: false })
  value: unknown = undefined

  /**
   * Whether to draw only the rows in view.
   *
   * For a value of thousands of entries. Reflected, because the box it scrolls
   * needs a height, which is a stylesheet rule reading this attribute.
   */
  @property({ reflect: true, type: Boolean })
  windowed = false

  /** The value read from `for`, when there is no `value`. */
  @state()
  private read: unknown = undefined

  /** The `for` that `read` came from, so it is read again only when that changes. */
  private loadedFor: string | undefined

  /** Which branches are open, by path. */
  @state()
  private opened = new Set<string>()

  /** The row the arrow keys are on, by its place among the visible rows. */
  @state()
  private cursor = 0

  /** A path written to `active` and not yet found among the rows. */
  private wanted: string | undefined

  /**
   * The branches written to `expanded`, until the next update applies them.
   *
   * Its own field, because a property declared with an accessor is in the
   * first update's changes whether or not anybody wrote it.
   */
  private declared: Set<string> | undefined

  /** The paths the filter matched, or nothing while there is no filter. */
  private found: Set<string> | undefined

  /** Set by a keyboard move, so the next render brings the active row into view. */
  private revealing = false

  /** What has been typed toward a key, and when the last letter came. */
  private typed = { at: 0, text: '' }

  /** The branches of the last value seen, by path, so a new value can tell old ones from new. */
  private branches = new Set<string>()

  /** Carries a host `aria-label` and `aria-labelledby` to the tree, which is what takes focus. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('tree'),
  })

  /** Says how many entries a filter matched. */
  private readonly status = new StatusController(this)

  /**
   * How tall a row is taken to be before it has been drawn, in pixels.
   *
   * A constant rather than the property `VirtualList` and `DataTable` carry:
   * every row here is one line of the same text at this family's own leading,
   * so there is nothing for a consumer to tell it. `reveal` falls back to this
   * when a drawn row measures zero, and the two have to be the same number or a
   * keyboard move scrolls by a different row than the window counted with.
   */
  static readonly ESTIMATE = 24

  private readonly virtualize = new VirtualizeController(this, {
    container: () => (this.windowed ? this.partNamed('tree') : null),
    count: () => this.rows.length,
    estimate: () => HelixHeadlessObjectInspector.ESTIMATE,
    measured: () => this.windowed,
    rows: () =>
      [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])].map(
        (element) => ({ element, index: Number(element.dataset.index) }),
      ),
  })

  private get root(): unknown {
    return this.value === undefined ? this.read : this.value
  }

  /** Every visible row, in order, worked out once per change rather than per read. */
  private rows: Row[] = []

  private readonly copier = new CopyController(this)

  /**
   * Opens every branch shallower than `defaultDepth`.
   *
   * `keep` is for a new value: a branch the last value also had keeps whether
   * a reader opened or closed it, and only a new one takes the default.
   * **Assigning a value used to close everything**, so an inspector showing
   * live data, a polled response or a debug panel, threw away the reader's
   * place on every update.
   */
  private seed(keep: boolean): void {
    const { branches, opened } = seed(
      this.root,
      this.defaultDepth,
      keep ? this.branches : undefined,
      this.opened,
    )
    this.branches = branches
    this.opened = opened
    if (!keep) {
      this.cursor = 0
    }
  }

  /** Opens the branches around each path, where the value has them. */
  private openAround(paths: Iterable<string>): void {
    const opened = new Set(this.opened)
    for (const path of paths) {
      for (const above of ancestorsOf(path)) {
        if (this.branches.has(above)) {
          opened.add(above)
        }
      }
    }
    this.opened = opened
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* First, so a value read from `for` is in the rows this update works out,
       and so in the first render. Resolved through `getRootNode()`, so an
       inspector inside another component's shadow root names a script in that
       root rather than in the page. Not on the server, whose shim has
       attributes and no tree to look an id up in, nor while hydrating what one
       sent. */
    if (this.loadedFor !== this.for && searchableById(this) && !this.hydrating) {
      this.loadedFor = this.for
      this.load()
    }
    /* The path the active row is on, so it stays there when the rows move. */
    const was = this.rows[this.cursor]?.path
    const written = this.declared
    this.declared = undefined
    const fresh = changed.has('value') || changed.has('read')
    if (fresh || changed.has('defaultDepth')) {
      this.seed(!changed.has('defaultDepth'))
    }
    /* A consumer's `expanded` is exactly what opens, a new value or not. */
    if (written) {
      this.opened = written
    }
    if (fresh || changed.has('filter')) {
      this.found = this.filter.trim() === '' ? undefined : search(this.root, this.filter)
      this.openAround(this.found ?? [])
    }
    const wanted = this.root === undefined ? undefined : this.wanted
    if (wanted !== undefined) {
      this.wanted = undefined
      this.openAround([wanted])
    }
    if (
      fresh ||
      wanted !== undefined ||
      ['active', 'defaultDepth', 'expanded', 'filter', 'opened'].some((name) => changed.has(name))
    ) {
      this.rows = flatten(this.root, this.opened, this.found)
      this.cursor = this.place(wanted ?? was, changed.has('filter'))
    }
    if (changed.has('filter') && this.hasUpdated) {
      this.tell()
    }
  }

  /**
   * Where the active row goes once the rows have moved: onto `path` where it
   * is still shown, onto the first match where a filter just hid it, and
   * otherwise onto the nearest branch around it that is.
   */
  private place(path: string | undefined, filtered: boolean): number {
    const rows = this.rows
    const at = (one: string): number => rows.findIndex((row) => row.path === one)
    const own = path === undefined ? -1 : at(path)
    if (own >= 0 || path === undefined) {
      return own >= 0 ? own : Math.min(this.cursor, Math.max(0, rows.length - 1))
    }
    const match = filtered ? rows.findIndex((row) => row.match) : -1
    const around = ancestorsOf(path)
      .reverse()
      .map(at)
      .find((one) => one >= 0)
    return match >= 0 ? match : (around ?? 0)
  }

  /** Says how many entries the filter matched, and nothing for an empty one. */
  private tell(): void {
    if (this.found) {
      this.status.say(countLabel(this.found.size, this.resultLabel, this.resultsLabel, this.lang))
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    /* The controller measures once rows it drew report their heights, and a
       window that has drawn nothing yet has none to report, so it is asked here
       as `VirtualList` asks it. */
    if (this.windowed) {
      this.virtualize.measure()
    }
    if (this.revealing) {
      this.revealing = false
      this.reveal()
    }
  }

  private load(): void {
    const text = this.for === '' ? '' : (elementById(this, this.for)?.textContent ?? '')
    try {
      this.read = text.trim() === '' ? undefined : (JSON.parse(text) as unknown)
    } catch {
      this.read = undefined
    }
  }

  /**
   * Brings the active row into the box.
   *
   * **A windowed tree may not have drawn it, and a jump straight to where it
   * should be does not land.** The controller places rows it has not measured at
   * its estimate, so an offset computed from a real row's height points at a
   * different row, and asking again from there asks the same wrong question: the
   * first version of this looped until the page stopped. So each attempt steps
   * from the rows that *are* drawn toward the one wanted, by how many rows lie
   * between, which closes the gap every time whatever the estimate is, and gives
   * up after a few rather than trusting that it always will.
   */
  private reveal(attempts = 8): void {
    const tree = this.partNamed('tree')
    const row = tree?.querySelector<HTMLElement>(`[data-index="${this.cursor}"]`)
    if (row) {
      // Inside the tree only: `Element.scrollIntoView` takes the page with it.
      scrollItemIntoView(row)
      return
    }
    const drawn = [...(tree?.querySelectorAll<HTMLElement>('[part~="row"]') ?? [])]
    const first = drawn[0]
    const last = drawn.at(-1)
    if (!tree || !this.windowed || !first || !last || attempts === 0) {
      return
    }
    const height = first.offsetHeight || HelixHeadlessObjectInspector.ESTIMATE
    const from = Number(
      this.cursor > Number(last.dataset.index) ? last.dataset.index : first.dataset.index,
    )
    tree.scrollTop += (this.cursor - from) * height
    this.virtualize.measure()
    void this.updateComplete.then(() => this.reveal(attempts - 1))
  }

  /** What copying takes: a branch as indented JSON, a string as itself. */
  private copyable(row: Row | undefined): string {
    if (!row) {
      return ''
    }
    if (typeof row.value === 'string') {
      return row.value
    }
    return JSON.stringify(row.value, null, 2) ?? String(row.value)
  }

  private toggle(row: Row, open = !row.open): void {
    const opened = new Set(this.opened)
    if (open) {
      opened.add(row.path)
    } else {
      opened.delete(row.path)
    }
    this.opened = opened
  }

  /**
   * Moves the active row, asking first: `helix-before-activate` with the path,
   * then `helix-activate` once it has moved. Returns whether it is there.
   */
  private move(to: number): boolean {
    const at = Math.max(0, Math.min(to, this.rows.length - 1))
    const path = this.rows[at]?.path
    if (path === undefined) {
      return false
    }
    if (at !== this.cursor) {
      const moved = requestChange({
        apply: () => {
          this.cursor = at
        },
        event: (value) => new HelixBeforeActivateEvent({ value }),
        host: this,
        next: path,
      })
      if (!moved) {
        return false
      }
      this.dispatchEvent(new HelixActivateEvent({ value: path }))
    }
    this.revealing = true
    return true
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const rows = this.rows
    const row = rows[this.cursor]
    if (!row) {
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      /* A selection is left alone: somebody who dragged across three lines
         wants those three lines, not the row the arrow keys were on. */
      if (globalThis.getSelection?.()?.toString()) {
        return
      }
      void this.copier.copy(this.copyable(row))
      event.preventDefault()
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        this.move(this.cursor + 1)
        break
      case 'ArrowUp':
        this.move(this.cursor - 1)
        break
      case 'Home':
        this.move(0)
        break
      case 'End':
        this.move(rows.length - 1)
        break
      case 'ArrowRight':
      case 'ArrowLeft':
        /* In is where a shut row's caret points, along the line, so it is the
           left arrow on a right-to-left page and the right one comes back. */
        if (inlineStep(this, event.key) === 1) {
          if (row.branch && !row.open) {
            this.toggle(row, true)
          } else if (row.open) {
            this.move(this.cursor + 1)
          }
        } else if (row.open) {
          this.toggle(row, false)
        } else {
          const parent = rows.findLastIndex(
            (candidate, at) => at < this.cursor && candidate.depth === row.depth - 1,
          )
          if (parent >= 0) {
            this.move(parent)
          }
        }
        break
      case 'Enter':
      case ' ':
        if (row.branch) {
          this.toggle(row)
        }
        break
      case '*':
        this.openSiblings(row)
        break
      default:
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
          return
        }
        this.typeahead(event.key)
    }
    event.preventDefault()
  }

  /** Opens every branch at the active row's level under the same parent, as `*` asks. */
  private openSiblings(row: Row): void {
    const parent = row.path.slice(0, row.path.lastIndexOf('/'))
    const opened = new Set(this.opened)
    for (const one of this.rows) {
      if (
        one.branch &&
        one.depth === row.depth &&
        one.path.slice(0, one.path.lastIndexOf('/')) === parent
      ) {
        opened.add(one.path)
      }
    }
    this.opened = opened
  }

  /**
   * Moves to the next row whose key starts with what was typed.
   *
   * Letters typed within half a second of each other run together, so `me`
   * finds `meta` past `message`. A repeated single letter cycles through the
   * keys that start with it.
   */
  private typeahead(letter: string): void {
    const now = Date.now()
    const text = now - this.typed.at < 500 ? this.typed.text + letter : letter
    this.typed = { at: now, text }
    const wanted = text.toLocaleLowerCase()
    const repeated = [...wanted].every((one) => one === wanted[0])
    const rows = this.rows
    const start = wanted.length === 1 || repeated ? this.cursor + 1 : this.cursor
    for (let step = 0; step < rows.length; step += 1) {
      const at = (start + step) % rows.length
      const key = rows[at]?.key?.toLocaleLowerCase()
      if (key?.startsWith(repeated ? (wanted[0] ?? '') : wanted)) {
        this.move(at)
        return
      }
    }
  }

  /** A press opens or closes the row it lands on, once that row is the active one. */
  private handleRowClick(index: number, row: Row): void {
    if (this.move(index) && row.branch) {
      this.toggle(row)
    }
  }

  /** Text typed in the filter field, asked for before the tree narrows to it. */
  private readonly handleFilterInput = (event: Event): void => {
    const field = event.currentTarget as HTMLInputElement
    const applied = requestChange({
      apply: (value) => {
        this.filter = value
      },
      event: (value) => new HelixFilterEvent({ value }),
      host: this,
      next: field.value,
    })
    if (applied) {
      this.dispatchEvent(new HelixFilteredEvent({ value: field.value }))
    } else {
      field.value = this.filter
    }
  }

  /** Down from the filter field goes to the tree, where the matches are. */
  private readonly handleFilterKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.partNamed('tree')?.focus()
    }
  }

  /* **What follows a key is isolated, so a right-to-left page orders the row
     and not the text inside it.** Unisolated, a row was one bidirectional run:
     a string's closing quote went to the far end, `"id: "dpl_8f2c`, a row
     holding a number or a branch read left to right while a row holding a
     string read right to left, and "8 keys" came out "keys 8". A value is
     code, a JSON literal, so it reads left to right on any page, and the count
     takes the direction of what it says. The key stays in the line: isolating
     it as well changed no row's order and redrew the colon after an index. */
  private renderValue(row: Row): TemplateResult {
    const { value } = row
    if (row.branch) {
      const count = entries(value as object).length
      const array = Array.isArray(value)
      /* The language's own rule for which form a count takes, so a page that
         sets `lang` and both words reads them right. */
      const one = new Intl.PluralRules(this.lang || undefined).select(count) === 'one'
      const words = array
        ? one
          ? this.itemLabel
          : this.itemsLabel
        : one
          ? this.keyLabel
          : this.keysLabel
      return html`<span part="summary">${array ? '[…]' : '{…}'}</span>
        <span part="count" dir="auto"
          >${fillTemplate(words, { count: formatNumbers(this.lang)(count) })}</span
        >`
    }
    if (typeof value === 'string') {
      return html`<span part="string" dir="ltr">${JSON.stringify(value)}</span>`
    }
    if (typeof value === 'number') {
      return html`<span part="number" dir="ltr">${String(value)}</span>`
    }
    if (typeof value === 'boolean') {
      return html`<span part="boolean" dir="ltr">${String(value)}</span>`
    }
    if (value === null) {
      return html`<span part="null" dir="ltr">null</span>`
    }
    return html`<span part="string" dir="ltr">${String(value)}</span>`
  }

  /**
   * One entry, named for its state where it holds one.
   *
   * **`row-active` and no attribute beside it.** Which row the keys are on is
   * drawn by a sheet and by nothing else: the accessibility tree hears it from
   * `aria-activedescendant` on the tree, which points at this row's id, so an
   * attribute would be a second spelling with no reader. The name is the one a
   * consumer can reach, nothing being able to follow `::part()` with an
   * attribute selector.
   *
   * **`aria-selected="false"` on every row**, because nothing here is chosen.
   * Chromium takes the active descendant of a single-selection tree as selected
   * when no row says otherwise, so every arrow press was also announced as a
   * selection. An explicit false is the one thing that turns that off.
   */
  private renderRow(row: Row, index: number): TemplateResult {
    const active = index === this.cursor
    return html`<div
      part="row${active ? ' row-active' : ''}${row.match ? ' row-match' : ''}"
      role="treeitem"
      id=${`row-${index}`}
      data-index=${index}
      aria-level=${row.depth + 1}
      aria-posinset=${row.position}
      aria-selected="false"
      aria-setsize=${row.siblings}
      aria-expanded=${row.branch ? String(row.open) : nothing}
      style=${`--object-inspector-level: ${row.depth}`}
      @click=${() => this.handleRowClick(index, row)}
    >
      ${
        row.branch
          ? html`<svg
              part="toggle"
              ?data-mirror=${!row.open}
              fill="currentColor"
              viewBox=${(row.open ? caretDown : caretRight).viewBox}
              aria-hidden="true"
            >
              ${unsafeSVG((row.open ? caretDown : caretRight).content)}
            </svg>`
          : nothing
      }${row.key === undefined ? nothing : html`<span part="key">${row.key}</span>: `}${this.renderValue(row)}
    </div>`
  }

  /** The copy button, behind the seam Code Block's uses, so each tier renders its own. */
  protected renderCopyButton(row: Row | undefined): TemplateResult {
    return staticHtml`<${this.tag('copy-button')}
      part="copy"
      exportparts="button: copy-button, live: copy-live, text: copy-text, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow, tooltip-arrow-bottom: copy-tooltip-arrow-bottom,
        tooltip-arrow-left: copy-tooltip-arrow-left, tooltip-arrow-right: copy-tooltip-arrow-right,
        tooltip-arrow-top: copy-tooltip-arrow-top, tooltip-bottom: copy-tooltip-bottom,
        tooltip-left: copy-tooltip-left, tooltip-right: copy-tooltip-right, tooltip-top: copy-tooltip-top"
      label=${row?.key === undefined ? this.copyValueLabel : fillTemplate(this.copyLabel, { name: row.key })}
      .value=${this.copyable(row)}
    ></${this.tag('copy-button')}>`
  }

  protected override render(): TemplateResult {
    const rows = this.rows
    const { after, before, first, last } = this.windowed
      ? this.virtualize.window
      : { after: 0, before: 0, first: 0, last: rows.length }
    const shown = rows.slice(first, last)
    return html`${
      this.label ? html`<div part="header"><span part="label">${this.label}</span></div>` : nothing
    }${
      this.filterable
        ? html`<input
            part="search-field"
            type="search"
            spellcheck="false"
            .value=${this.filter}
            placeholder=${this.filterLabel}
            aria-label=${this.filterLabel}
            aria-controls="tree"
            @input=${this.handleFilterInput}
            @keydown=${this.handleFilterKeydown}
          />`
        : nothing
    }
      <div part="frame">
        <div
          part="tree"
          id="tree"
          role="tree"
          tabindex="0"
          ?data-scroller=${this.windowed}
          aria-label=${this.label || this.treeLabel}
          aria-activedescendant=${rows.length > 0 ? `row-${this.cursor}` : nothing}
          @keydown=${this.handleKeydown}
          @scroll=${() => this.virtualize.measure()}
        >
          ${this.windowed ? html`<div part="before" role="presentation" style="block-size: ${before}px"></div>` : nothing}
          ${shown.map((row, at) => this.renderRow(row, first + at))}
          ${this.windowed ? html`<div part="after" role="presentation" style="block-size: ${after}px"></div>` : nothing}
        </div>
        ${this.noCopy ? nothing : this.renderCopyButton(rows[this.cursor])}
      </div>
      ${drawStatus(this.status)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-object-inspector': HelixHeadlessObjectInspector
  }
}
