import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { caretRight, check } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * Three shapes, one element, because a reader moving down a menu with the
 * arrow keys does not care which kind each row is and neither should the
 * markup. What it is follows from what it was given: something slotted into
 * `submenu` makes it a way in, `checked` makes it a choice, and neither makes
 * it a command.
 *
 * **The role follows the shape.** A row that can be ticked is
 * `menuitemcheckbox` and carries `aria-checked`, because a reader is told "one
 * of these is on" rather than "here is a button". A row that opens a page keeps
 * `menuitem` and says `aria-haspopup`, since the page it opens is a menu.
 *
 * Whether it is on the page showing is set by the menu as a property, never as
 * an attribute: an attribute written onto a consumer's element after it
 * upgrades is a hydration mismatch waiting to happen.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Menu option, Menu row
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @slot - The label.
 * @slot start - Before the label. A mark about the row.
 * @slot submenu - Rows this one opens, which makes it a way in.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart item - The row, which is an `<a>` where `href` is set.
 * @csspart mark - The trailing mark: a tick when checked, a caret when it opens
 * a page. One column, because a row is never both.
 * @csspart start - The leading column, which is a slot and is always there.
 */
@customElement('helix-headless-menu-item')
export class HelixHeadlessMenuItem extends HelixElement {
  /**
   * Whether the row is one of a set of choices.
   *
   * Separate from `checked`, and it has to be. A row that is off is still a
   * choice, and `checked` alone cannot say so: an unticked row and a row that
   * was never tickable look identical from here. Announcing only the ticked one
   * as a checkbox tells a reader its siblings are commands, which is the one
   * thing they are not.
   *
   * `checked` implies it, so a row that is on never has to say both.
   */
  @property({ reflect: true, type: Boolean })
  checkable = false

  /**
   * Whether the row is ticked.
   */
  @property({ reflect: true, type: Boolean })
  checked = false

  /**
   * Whether the row can be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the link saves the file rather than opening it.
   *
   * Only meaningful beside an `href`, and only for a file served from this
   * origin: the attribute is ignored cross-origin, which is the browser's rule
   * about who may name a file on somebody's disk rather than a gap here.
   */
  @property({ type: Boolean })
  download = false

  /**
   * Where the row goes, which makes it a real link.
   *
   * **The row itself becomes an `<a>`, and the role goes with it.** A
   * `menuitem` cannot contain a link: measured in Chromium, an anchor inside
   * one is exposed as a child and the row loses its accessible name entirely.
   * So the anchor *is* the row, carrying `menuitem` and the `tabindex` the menu
   * roves, which is the same maneuver `Tree.Item` makes and the reason `href`
   * changes the markup rather than only adding an attribute.
   *
   * **`Option` cannot have this and the reason is worth knowing**, since a
   * command palette is the obvious place to want it. A listbox has to keep
   * focus somewhere else, in the text field for a combobox, so it says which
   * option is current with `aria-activedescendant`. That reference can only
   * point at the option's host, measured: assigning
   * `ariaActiveDescendantElement` an element inside a sibling shadow root reads
   * back `null`. So `role="option"` is pinned to the host, and an anchor under
   * it hits the naming failure above. A menu has no such constraint because
   * focus really moves to the row.
   */
  @property()
  href = ''

  /**
   * Whether this row is on the page currently showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business.
   */
  @property({ attribute: false })
  onPage = true

  /**
   * The relationship, which `target="_blank"` should always set.
   */
  @property()
  rel = ''

  /**
   * Whether the page showing is this row's submenu, or one below it.
   *
   * Separate from `onPage`, and it has to be. A row that opened a page is not
   * itself on that page, so both are false for it, and rendering nothing on
   * that basis takes its `slot[name="submenu"]` with it: the rows inside have
   * nowhere to be assigned and are never laid out. Every row on the way down to
   * the open page has to keep its slot, not only the one directly above it.
   * Three levels deep, the topmost row holds the slot the middle one lives in.
   */
  @property({ attribute: false })
  showingSubmenu = false

  /**
   * Where the link opens, for the rows that should leave the page.
   */
  @property()
  target = ''

  /**
   * What this row stands for, carried in the event when it is chosen.
   */
  @property()
  value = ''

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isMenuItem = true

  /**
   * Whether anything was slotted into `submenu`.
   *
   * False on the server, which is the right answer rather than a safe one: the
   * server cannot know whether a submenu was slotted, and a row that served an
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess.
   */
  get hasSubmenu(): boolean {
    return this.submenu
  }

  /**
   * Whether anything is slotted into `submenu`. Read after first render.
   *
   * State rather than a getter over `children`. A getter is read during
   * `render()` with nothing to re-read it, so a submenu arriving after the
   * row's first render produces no caret and no `aria-haspopup` while selecting
   * the row still drills in, which is what a framework filling a submenu on
   * demand hits every time. `Tree.Item` backs `branch` the same way for the
   * same reason.
   *
   * Kept in step by `readSubmenu`, which is bound in the template rather than
   * once at first render. See the note there.
   */
  @state()
  private submenu = false

  /**
   * Whether anything is slotted before the label.
   *
   * The leading box is drawn only where there is something to put in it, the
   * same way the trailing mark is. What keeps the labels on one edge is the
   * track the menu reserves for the page, not a box on every row, so a row with
   * nothing here takes no box and still lines up with its neighbors.
   *
   * Read from the slot rather than from the light DOM, because the light DOM
   * answer is not reactive: a consumer who adds an icon to one row after first
   * render changes nothing this element is told about, and `slotchange` is
   * exactly the thing that is.
   */
  @state()
  private start = false

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.readSubmenu()
    this.readStart()
  }

  /**
   * Re-reads whether anything is before the label.
   *
   * The slot itself is always rendered and it is the box around it that comes
   * and goes, which is what makes this safe where `readSubmenu` needed the note
   * it carries: there is one `slot[name="start"]` in one template branch, so it
   * is never rebuilt and never fires on its way out.
   */
  private readonly readStart = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="start"]')
    this.start = (slot?.assignedNodes().length ?? 0) > 0
  }

  /**
   * Re-reads whether anything is in the submenu, from whichever slot is current.
   *
   * **Bound in the template, and it has to be.** This row renders a
   * `slot[name="submenu"]` in two template branches, one for the row and one
   * for the page it opens, and moving between them makes Lit build a new slot
   * and throw the old one away. A listener added at `firstUpdated` stays on the
   * discarded slot, which fires `slotchange` on its way out with nothing
   * assigned to it any more: one drill-in sets `submenu` false and nothing is
   * left listening to set it back, so every caret in the menu vanishes and
   * every row stops opening.
   *
   * The live slot is asked rather than `event.target`, so it does not matter
   * which of the two fired or in what order.
   */
  private readonly readSubmenu = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="submenu"]')
    this.submenu = (slot?.assignedElements().length ?? 0) > 0
  }

  /**
   * Moves focus onto the row itself.
   *
   * The host is not focusable: what takes focus is the row inside this shadow
   * root, and a menu moving between rows with the arrow keys has to reach it.
   */
  override focus(): void {
    this.renderRoot.querySelector<HTMLElement>('[part="item"]')?.focus()
  }

  /**
   * `NavigableItem`, so the arrow keys can be the shared controller's business.
   *
   * `focus()` above already puts focus on the control inside the row rather than
   * on the row, which is the whole of what moving here means.
   */
  focusItem(): void {
    this.focus()
  }

  /** Chooses the row, which is the same act as pressing it. */
  select(): void {
    this.choose()
  }

  /**
   * Whether this is the row the set is on, which in a menu is where focus is.
   *
   * A radio group's selection is an answer it holds; a menu has no answer, only
   * a row the reader has walked to, so focus is the whole of what "the current
   * one" can mean here. Read from the shadow root rather than kept as state,
   * because focus moves for reasons this element is not told about: a press, a
   * Tab, the drilldown putting the reader on the first row of a page it has
   * just opened.
   */
  get selected(): boolean {
    /* Asked of the document, not of the shadow root. Focus lands on the control
       inside this row, and the platform retargets it: from outside a shadow
       tree, `activeElement` is the host, which is this element. So the document
       already answers the question and nothing has to walk a tree to do it.
       `ShadowRoot.activeElement` is also the reading that does not survive
       happy-dom, which climbs `getRootNode()` to the top and then dereferences
       what it ran out of. */
    return this.ownerDocument.activeElement === this
  }

  private choose(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  private readonly handleClick = (): void => {
    this.choose()
  }

  /**
   * Enter and Space choose the row, which a `<div>` would not do on its own.
   *
   * It is not a `<button>`: a button inside a menu is announced as a button,
   * and the roles a menu needs are not roles a button can take.
   *
   * **A linked row hands Enter back to the browser.** An anchor answers Enter
   * itself, by firing a click and following the link, so preventing the default
   * here would mean re-issuing that navigation by hand and losing whatever the
   * browser does around it. `Tree.Item` records the same trap from the other
   * side: its tree prevents every key it handles, which is exactly what was
   * swallowing Enter on its rows.
   *
   * Space is different, and that is the platform rather than a choice: an
   * anchor ignores it. So the row presses itself, and the click that comes back
   * both announces and navigates.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    const link = this.renderRoot.querySelector<HTMLAnchorElement>('a[part="item"]')
    if (link && event.key === 'Enter') {
      return
    }
    event.preventDefault()
    if (link) {
      link.click()
      return
    }
    this.handleClick()
  }

  protected override render(): TemplateResult | typeof nothing {
    // The page this row opened is showing, so what it contributes is the slot
    // its rows are assigned to and nothing else. Its own row belongs to the
    // page above.
    if (this.showingSubmenu) {
      return html`<slot name="submenu" @slotchange=${this.readSubmenu}></slot>`
    }
    /* Not on the page showing, so there is nothing to draw. Rendering nothing
       rather than hiding it with an attribute, because the attribute would be
       one this element wrote onto itself, and there is no state to keep: the
       rows are in the light DOM and come back as they were.

       That is also why the slot at the end of this render is inside a hidden
       box. A row keeps its submenu slot while its own page is showing, so the
       rows in there are assigned and can be marked; each of them answers `onPage`
       by drawing nothing, so they need no help. Anything that is *not* a row has
       no such idea and painted on the page above: a `Divider` slotted into a
       submenu drew its rule between two rows of the parent menu, which is the
       same fault `Menu`'s sheet fixes for its own slot and could not reach into
       here. Hidden rather than absent, because the slot has to stay for the
       assignment to hold and for `readSubmenu` to hear it. */
    if (!this.onPage) {
      return nothing
    }
    const submenu = this.hasSubmenu
    /* One row, two tags. Everything about it is the same but the element, which
       is what an `href` changes: the anchor carries the role and the tab stop
       rather than sitting inside something that does, for the reason the
       property's own note records. `Tree.Item` writes its two the same way.

       A disabled row renders no `href`. A disabled anchor is not a thing the
       platform has, and `aria-disabled` alone still navigates. */
    const linked = this.href !== '' && !this.disabled
    const role = this.checkable || this.checked ? 'menuitemcheckbox' : 'menuitem'
    const checkedState =
      this.checkable || this.checked ? (this.checked ? 'true' : 'false') : nothing
    const inside = html`<span part="start" ?data-empty=${!this.start}
          ><slot name="start" @slotchange=${this.readStart}></slot
        ></span>
        <slot></slot>
        ${
          // One trailing column, and a row is never both: a way into a page has
          // nothing to tick, and a choice opens nothing. The tick sits after the
          // label rather than before it, so the labels start at the edge of the
          // row and the marks line up down the side they are read from.
          //
          // `data-submenu` is what tells the two apart from CSS. They share a
          // part name because they share a column, and only one of them is
          // directional: a caret has to mirror in a right-to-left document and a
          // tick must not, which Unicode's own mirroring list agrees on. The
          // attribute is on an element in this shadow root rather than on the
          // host, so it is the divider's `data-empty` and not a hydration
          // hazard. `hasSubmenu` is derived from slot assignment and has no
          // attribute a selector could read instead.
          submenu
            ? html`<svg
                part="mark"
                data-submenu
                fill="currentColor"
                viewBox=${caretRight.viewBox}
                aria-hidden="true"
              >
                ${unsafeSVG(caretRight.content)}
              </svg>`
            : this.checked
              ? html`<svg
                  part="mark"
                  fill="currentColor"
                  viewBox=${check.viewBox}
                  aria-hidden="true"
                >
                  ${unsafeSVG(check.content)}
                </svg>`
              : /* Nothing to mark, so nothing is drawn. The column this would
                   have sat in is reserved by the menu when some row on the page
                   needs one, so the labels still line up without every row
                   carrying an empty box to line them up with. */
                nothing
        }`
    return html`${
      linked
        ? html`<a
            part="item"
            href=${this.href}
            target=${this.target || nothing}
            rel=${this.rel || nothing}
            ?download=${this.download}
            role=${role}
            aria-checked=${checkedState}
            aria-haspopup=${submenu ? 'menu' : nothing}
            tabindex="-1"
            @click=${this.handleClick}
            @keydown=${this.handleKeydown}
          >${inside}</a>`
        : html`<div
            part="item"
            role=${role}
            aria-checked=${checkedState}
            aria-disabled=${this.disabled ? 'true' : nothing}
            aria-haspopup=${submenu ? 'menu' : nothing}
            tabindex=${this.disabled ? nothing : '-1'}
            @click=${this.handleClick}
            @keydown=${this.handleKeydown}
          >${inside}</div>`
    }
      <div hidden><slot name="submenu" @slotchange=${this.readSubmenu}></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu-item': HelixHeadlessMenuItem
  }
}
