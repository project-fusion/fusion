import {
  CopyController,
  customElement,
  HelixElement,
  scrollItemIntoView,
  VirtualizeController,
} from '@fusion.dev/helix-core'
import { caretDown, caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html as staticHtml } from 'lit/static-html.js'
import '../../copy-button/index.js'

/** One visible line of the tree: a value, where it sits, and whether it is open. */
interface Row {
  branch: boolean
  depth: number
  /** The property name or array index this value is under; absent for the root. */
  key?: string
  open: boolean
  path: string
  position: number
  siblings: number
  value: unknown
}

const branchy = (value: unknown): value is object => value !== null && typeof value === 'object'

const entries = (value: object): [string, unknown][] =>
  Array.isArray(value) ? value.map((item, at) => [String(at), item]) : Object.entries(value)

/** A child's path under its parent's, escaped the way a JSON Pointer escapes one. */
const child = (path: string, key: string): string =>
  `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`

/**
 * @summary A value read as a tree: collapse what you do not need, count what
 * you collapsed, copy the part you do.
 *
 * @description
 * What a developer-facing product shows constantly is a structured value: an
 * API response, a config, a row's raw record. As text in a code block, a reader
 * scrolls a wall of JSON and cannot put away the branch they do not care about;
 * as a Tree, every node is a label and a string reads the same as a number. This
 * reads the value and draws each entry with its type visible.
 *
 * **It reads and never edits.** An inspector that edits is a different
 * component, with validation, undo and a model of what changed, and the reading
 * one is what is wanted.
 *
 * **The data is text in the page or a property.** `for` names a
 * `<script type="application/json">` by id, the channel `VirtualList` and the
 * charts already read: it survives a server, which has attributes and no
 * children, and React's hydration, which skips object properties. `value` is
 * there for a page that already holds the object, and wins when both are set.
 *
 * **One tab stop, and the rows are reached with the arrow keys**, the tree
 * pattern: Up and Down move, Right opens a branch or enters it, Left closes it or
 * goes to its parent, Home and End go to the ends. The tree keeps focus and
 * points at the active row with `aria-activedescendant`, which is what lets a
 * windowed tree drop rows from the page without dropping focus with them. Each
 * row carries its real level, position and set size, so a reader on a windowed
 * row hears where it is in the value rather than in the slice drawn.
 *
 * **Copying takes the active row**, as JSON for a branch and as itself for a
 * string, from the copy button or from Command or Control with C while the tree
 * has focus and nothing is selected. The button sits beside the tree rather than in each row, where a
 * button would be an interactive control inside a tree item, which assistive
 * technology cannot reach reliably.
 *
 * **`windowed` draws only the rows in view**, for a value of thousands of
 * entries, through the same controller `VirtualList` and `DataTable` use. The
 * box has to have a height for that to mean anything, which the styled tier
 * gives it and a headless consumer has to.
 *
 * @since 0.1.0
 * @status experimental
 * @category data
 * @aliases JSON viewer, Object viewer, Inspector, Data explorer
 * @documentation https://helix.fusion.dev/components/object-inspector
 *
 * @event {HelixCopyEvent} helix-copy - A value was put on the clipboard, from the copy button or the keyboard.
 *
 * @csspart after - The room the rows after the window would take, when windowed.
 * @csspart before - The room the rows before the window would take, when windowed.
 * @csspart boolean - A `true` or `false`.
 * @csspart copy - The copy button, which copies the active row.
 * @csspart copy-button - The inner button.
 * @csspart copy-mark - The clipboard glyph, and the confirmation that replaces it.
 * @csspart copy-tooltip - The bubble, forwarded from the tooltip inside.
 * @csspart copy-tooltip-arrow - The point, resting against the trigger.
 * @csspart count - How many entries a branch holds.
 * @csspart frame - The tree and the copy button beside it.
 * @csspart header - The bar carrying the label, where there is one.
 * @csspart key - A property name or an array index.
 * @csspart label - The label.
 * @csspart null - A `null`.
 * @csspart number - A number.
 * @csspart row - One entry, a tree item.
 * @csspart row-active - The entry the keyboard is on, beside `row`.
 * @csspart string - A string, in quotes.
 * @csspart summary - The brackets standing for a branch's contents.
 * @csspart toggle - The caret on a branch: down when open, across when closed.
 * @csspart tree - The tree, the one thing focus lands on.
 *
 * @cssproperty --object-inspector-level - How deep a row is, from 0 at the root, for indenting it.
 */
@customElement('helix-headless-object-inspector')
export class HelixHeadlessObjectInspector extends HelixElement {
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
   * The id of a `<script type="application/json">` holding the value.
   *
   * Read once the document exists, and again whenever this changes. Text that
   * does not parse leaves the inspector empty rather than throwing, since a
   * page's markup should not take the page down over a comma.
   */
  @property()
  for = ''

  /**
   * Accessible name for the tree, and the text of the header where there is one.
   */
  @property()
  label = ''

  /**
   * Whether to leave the copy button off.
   *
   * Negative for the reason Code Block's is: a boolean attribute defaulting to
   * true could never be turned off from markup.
   */
  @property({ attribute: 'no-copy', reflect: true, type: Boolean })
  noCopy = false

  /**
   * The value itself, for a page that already holds it.
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
  private active = 0

  /** Set by a keyboard move, so the next render brings the active row into view. */
  private revealing = false

  private readonly virtualize = new VirtualizeController(this, {
    container: () => (this.windowed ? this.partNamed('tree') : null),
    count: () => this.rows.length,
    estimate: () => 24,
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

  /** Every visible row, in order, for the tree as it stands. */
  private flatten(): Row[] {
    const rows: Row[] = []
    if (this.root === undefined) {
      return rows
    }
    const visit = (
      value: unknown,
      path: string,
      depth: number,
      position: number,
      siblings: number,
      key?: string,
    ): void => {
      const branch = branchy(value)
      const open = branch && this.opened.has(path)
      rows.push({
        branch,
        depth,
        open,
        path,
        position,
        siblings,
        value,
        ...(key === undefined ? {} : { key }),
      })
      if (open) {
        const children = entries(value)
        children.forEach(([name, item], at) => {
          visit(item, child(path, name), depth + 1, at + 1, children.length, name)
        })
      }
    }
    visit(this.root, '', 0, 1, 1)
    return rows
  }

  /** Opens every branch shallower than `defaultDepth`. */
  private seed(): void {
    const opened = new Set<string>()
    const visit = (value: unknown, path: string, depth: number): void => {
      if (!branchy(value) || depth >= this.defaultDepth) {
        return
      }
      opened.add(path)
      for (const [name, item] of entries(value)) {
        visit(item, child(path, name), depth + 1)
      }
    }
    visit(this.root, '', 0)
    this.opened = opened
    this.active = 0
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* First, so a value read from `for` is in the rows this update works out,
       and so in the first render. Not on the server, whose shim has attributes
       and no document to look an id up in, nor while hydrating what one sent. */
    if (
      this.loadedFor !== this.for &&
      typeof this.ownerDocument?.getElementById === 'function' &&
      !this.hydrating
    ) {
      this.loadedFor = this.for
      this.load()
    }
    if (changed.has('value') || changed.has('read') || changed.has('defaultDepth')) {
      this.seed()
    }
    if (
      changed.has('value') ||
      changed.has('read') ||
      changed.has('opened') ||
      changed.has('defaultDepth')
    ) {
      this.rows = this.flatten()
      this.active = Math.min(this.active, Math.max(0, this.rows.length - 1))
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
    const text =
      this.for === '' ? '' : (this.ownerDocument.getElementById(this.for)?.textContent ?? '')
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
    const row = tree?.querySelector<HTMLElement>(`[data-index="${this.active}"]`)
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
    const height = first.offsetHeight || 24
    const from = Number(
      this.active > Number(last.dataset.index) ? last.dataset.index : first.dataset.index,
    )
    tree.scrollTop += (this.active - from) * height
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

  private move(to: number): void {
    const last = this.rows.length - 1
    this.active = Math.max(0, Math.min(to, last))
    this.revealing = true
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const rows = this.rows
    const row = rows[this.active]
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
        this.move(this.active + 1)
        break
      case 'ArrowUp':
        this.move(this.active - 1)
        break
      case 'Home':
        this.move(0)
        break
      case 'End':
        this.move(rows.length - 1)
        break
      case 'ArrowRight':
        if (row.branch && !row.open) {
          this.toggle(row, true)
        } else if (row.open) {
          this.move(this.active + 1)
        }
        break
      case 'ArrowLeft':
        if (row.open) {
          this.toggle(row, false)
        } else {
          const parent = rows.findLastIndex(
            (candidate, at) => at < this.active && candidate.depth === row.depth - 1,
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
      default:
        return
    }
    event.preventDefault()
  }

  private handleRowClick(index: number, row: Row): void {
    this.active = index
    if (row.branch) {
      this.toggle(row)
    }
  }

  private renderValue(row: Row): TemplateResult {
    const { value } = row
    if (row.branch) {
      const count = entries(value as object).length
      const array = Array.isArray(value)
      const noun = array ? (count === 1 ? 'item' : 'items') : count === 1 ? 'key' : 'keys'
      return html`<span part="summary">${array ? '[…]' : '{…}'}</span>
        <span part="count">${`${count} ${noun}`}</span>`
    }
    if (typeof value === 'string') {
      return html`<span part="string">${JSON.stringify(value)}</span>`
    }
    if (typeof value === 'number') {
      return html`<span part="number">${String(value)}</span>`
    }
    if (typeof value === 'boolean') {
      return html`<span part="boolean">${String(value)}</span>`
    }
    if (value === null) {
      return html`<span part="null">null</span>`
    }
    return html`<span part="string">${String(value)}</span>`
  }

  private renderRow(row: Row, index: number): TemplateResult {
    const active = index === this.active
    return html`<div
      part="row${active ? ' row-active' : ''}"
      role="treeitem"
      id=${`row-${index}`}
      data-index=${index}
      ?data-active=${active}
      aria-level=${row.depth + 1}
      aria-posinset=${row.position}
      aria-setsize=${row.siblings}
      aria-expanded=${row.branch ? String(row.open) : nothing}
      style=${`--object-inspector-level: ${row.depth}`}
      @click=${() => this.handleRowClick(index, row)}
    >
      ${
        row.branch
          ? html`<svg
              part="toggle"
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
      exportparts="button: copy-button, mark: copy-mark, tooltip: copy-tooltip,
        tooltip-arrow: copy-tooltip-arrow"
      label=${row?.key === undefined ? 'Copy value' : `Copy ${row.key}`}
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
    }
      <div part="frame">
        <div
          part="tree"
          role="tree"
          tabindex="0"
          ?data-scroller=${this.windowed}
          aria-label=${this.label || 'Value'}
          aria-activedescendant=${rows.length > 0 ? `row-${this.active}` : nothing}
          @keydown=${this.handleKeydown}
          @scroll=${() => this.virtualize.measure()}
        >
          ${this.windowed ? html`<div part="before" role="presentation" style="block-size: ${before}px"></div>` : nothing}
          ${shown.map((row, at) => this.renderRow(row, first + at))}
          ${this.windowed ? html`<div part="after" role="presentation" style="block-size: ${after}px"></div>` : nothing}
        </div>
        ${this.noCopy ? nothing : this.renderCopyButton(rows[this.active])}
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-object-inspector': HelixHeadlessObjectInspector
  }
}
