import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { caretRight, check } from '@helix-io/icons'
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
 * @event {HelixSelectEvent} helix-select - Fired when the row is chosen.
 *
 * @csspart item - The row, which is an `<a>` where `href` is set.
 * @csspart mark - The trailing mark: a tick when checked, a caret when it opens.
 * a page. One column, because a row is never both.
 * @csspart start - The leading column, which is a slot and is always there.
 */
@customElement('helix-headless-menu-item')
export class HelixHeadlessMenuItem extends HelixElement {
  /**
   * What this row stands for, carried in the event when it is chosen.
   */
  @property()
  value = ''

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
   * Where the row goes, which makes it a real link.
   *
   * **The row itself becomes an `<a>`, and the role goes with it.** A
   * `menuitem` cannot contain a link: measured in Chromium, an anchor inside
   * one is exposed as a child and the row loses its accessible name entirely.
   * So the anchor *is* the row, carrying `menuitem` and the `tabindex` the menu
   * roves, which is the same manoeuvre `Tree.Item` makes and the reason `href`
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
   * Where the link opens, for the rows that should leave the page.
   */
  @property()
  target = ''

  /**
   * The relationship, which `target="_blank"` should always set.
   */
  @property()
  rel = ''

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
   * Whether this row is on the page currently showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business.
   */
  @property({ attribute: false })
  onPage = true

  /**
   * Whether this row's submenu is the page showing.
   *
   * Separate from `onPage`, and it has to be. A row that opened a page is not
   * itself on that page, so both are false for it, and rendering nothing on
   * that basis takes its `slot[name="submenu"]` with it: the rows inside have
   * nowhere to be assigned and are never laid out. The element that holds the
   * page has to keep the slot even when it shows no row of its own.
   */
  @property({ attribute: false })
  showingSubmenu = false

  /**
   * @internal Read by a parent to identify its children across the light DOM,
   * which is cheaper than `instanceof` and is why this is public rather than
   * protected. Not a consumer's to read or set.
   */
  readonly isMenuItem = true

  /**
   * Whether anything was slotted into `submenu`.
   *
   * Client only, and the `?? []` is what makes that true rather than merely
   * documented. Lit's element shim carries attributes but not a tree, so
   * `children` is undefined on the server, and this getter is read during
   * `render`: spreading it threw, and a menu row could not be served at all.
   * Found by writing this component's SSR spec, which is the only place it
   * could have been found, because every other path runs in a browser.
   *
   * False on the server is also the right answer rather than a safe one: the
   * server cannot know whether a submenu was slotted, and a row that served a
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess.
   */
  get hasSubmenu(): boolean {
    return this.submenu
  }

  /**
   * Whether anything is slotted into `submenu`. Read after first render.
   *
   * State rather than a getter over `children`, which is what it was: read
   * during `render()` with nothing to re-read it, a submenu arriving after the
   * row's first render produced no caret and no `aria-haspopup` while selecting
   * the row still drilled in. A framework filling a submenu on demand hit that
   * every time. `Tree.Item` backs `branch` the same way for the same reason.
   *
   * Kept in step by `readSubmenu`, which is bound in the template rather than
   * once at first render. See the note there: bound once, a single drill-in left
   * it false for good.
   *
   * False on the server is the right answer rather than a safe one: the server
   * cannot know whether a submenu was slotted, and a row that served an
   * `aria-haspopup` it might not have would be a promise made to a screen
   * reader on the strength of a guess.
   */
  @state()
  private submenu = false

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.readSubmenu()
  }

  /**
   * Re-reads whether anything is in the submenu, from whichever slot is current.
   *
   * **Bound in the template, and it has to be.** It was `addEventListener` on
   * the slot found at `firstUpdated`, which is a different element from the one
   * showing a moment later: this row renders a `slot[name="submenu"]` in two
   * template branches, one for the row and one for the page it opens, and moving
   * between them makes Lit build a new slot and throw the old one away. The
   * listener stayed on the discarded slot, and the discarded slot fired
   * `slotchange` on its way out with nothing assigned to it any more. So one
   * drill-in set `submenu` false and nothing was left listening to set it back:
   * every caret in the menu vanished and every row stopped opening. Reported
   * from a recording of the sandbox's Environment menu.
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
    // Not on the page showing, so there is nothing to draw. Rendering nothing
    // rather than hiding it with an attribute, because the attribute would be
    // one this element wrote onto itself, and there is no state to keep: the
    // rows are in the light DOM and come back as they were.
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
    const inside = html`<span part="start"><slot name="start"></slot></span>
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
              : html`<span part="mark" aria-hidden="true"></span>`
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
      <slot name="submenu" @slotchange=${this.readSubmenu}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu-item': HelixHeadlessMenuItem
  }
}
