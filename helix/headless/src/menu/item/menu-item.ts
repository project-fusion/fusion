import {
  ariaChord,
  customElement,
  deepActiveElement,
  HelixBeforeToggleEvent,
  HelixElement,
  HelixSelectEvent,
  onApple,
  requestChange,
} from '@fusion.dev/helix-core'
import { caretRight, check } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html as staticHtml } from 'lit/static-html.js'
/* Relative, so this registers the base key and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../kbd/index.js'

/**
 * @summary One row in a menu: a command, a choice, or a way into a submenu.
 *
 * @description
 * One element covers three kinds of row, and what you give it decides which:
 * - Content in the `submenu` slot makes the row open a submenu page.
 * - `checked` makes the row a choice.
 * - With neither, the row is a command.
 *
 * The role follows the kind. A row with `checked` is `menuitemcheckbox` with
 * `aria-checked`, and `exclusive` makes it `menuitemradio`, for a set where
 * only one can be on. A row that opens a page keeps `menuitem` and sets
 * `aria-haspopup`.
 *
 * Choosing a choice row checks or unchecks it before `helix-select` is sent,
 * so a listener reads the new `checked`. An `exclusive` row turns on and turns
 * off the `exclusive` rows next to it. Cancel `helix-before-toggle` to keep a
 * row as it is and set `checked` yourself.
 *
 * The menu sets whether the row's page is showing as a property, never as an
 * attribute. An attribute written onto your element after it upgrades causes a
 * hydration mismatch.
 *
 * `shortcut` shows a row's keyboard shortcut after its label, drawn by `Kbd`
 * in the platform's glyphs, and gives the row `aria-keyshortcuts`. It binds
 * nothing: the shortcut is the page's to bind. Other trailing words, such as a
 * count, go in the `end` slot.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Menu option, Menu row
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @slot - The label.
 * @slot end - Words after the label, such as a count or a detail, beside any `shortcut`.
 * @slot start - Content before the label, such as an icon.
 * @slot submenu - The rows of a submenu that this row opens.
 *
 * @event {HelixBeforeToggleEvent} helix-before-toggle - A choice row is about to be checked or unchecked, carrying the state asked for. Cancelable: cancel it to keep the row as it is.
 * @event {HelixSelectEvent} helix-select - The row was chosen. Cancelable: cancel it to keep the menu open.
 *
 * @csspart end - The trailing column that holds the shortcut and the `end` slot. It is always rendered.
 * @csspart item - The row, which is an `<a>` where `href` is set.
 * @csspart mark - The trailing mark: a check mark when the row is checked, or a caret
 * when it opens a submenu. A row never shows both, so they share one column.
 * @csspart shortcut - The key drawn for `shortcut`.
 * @csspart shortcut-kbd - The key inside it.
 * @csspart start - The leading column that holds the `start` slot. It is always rendered.
 *
 * @cssstate checked - The row is checked.
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
   *
   * Choosing the row checks or unchecks it, after a `helix-before-toggle` that
   * you can cancel.
   */
  @property({ reflect: true, type: Boolean })
  checkable = false

  /**
   * Whether the row is checked.
   *
   * The row changes it when it is chosen. Not reflected: the attribute is the
   * state you start the row in, and `:state(checked)` carries the current one.
   */
  @property({ type: Boolean })
  checked = false

  /**
   * Whether the row is disabled, so it cannot be chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the link downloads the file when the row is chosen.
   *
   * Only meaningful beside an `href`, and only for a file served from this
   * origin: the attribute is ignored cross-origin, which is the browser's rule
   * about who may name a file on somebody's disk rather than a gap here.
   */
  @property({ type: Boolean })
  download = false

  /**
   * Whether only one row in its set can be checked at a time.
   *
   * The set is the run of `exclusive` rows next to this one, up to the first
   * element that is not one, such as a divider. Choosing a row in it checks
   * that row and unchecks the others. Choosing the row that is checked leaves
   * it checked. `menuitemradio` tells a reader which kind of set they are in,
   * where `menuitemcheckbox` says every row is independent.
   *
   * Meaningless without `checkable`, since a row that cannot be ticked is not
   * one of a set of anything.
   */
  @property({ reflect: true, type: Boolean })
  exclusive = false

  /**
   * The URL the row links to. Setting it renders the row as a link.
   *
   * **The row itself becomes an `<a>`, and the role goes with it.** A
   * `menuitem` cannot contain a link: measured in Chromium, an anchor inside
   * one is exposed as a child and the row loses its accessible name entirely.
   * So the anchor *is* the row, carrying `menuitem` and the `tabindex` the menu
   * roves, which is the same maneuver `Tree.Item` makes and the reason `href`
   * changes the markup rather than only adding an attribute.
   *
   * **`Option` takes an `href` too, and keeps its role a different way.** A
   * listbox keeps focus somewhere else, in the text field for a combobox, and
   * names the current option with `aria-activedescendant`, which can only point
   * at the option's host. So an option stays `role="option"` on its host, draws
   * no anchor, and follows its link through an anchor made for the moment. A
   * menu has no such constraint, because focus really moves to the row.
   */
  @property()
  href = ''

  /**
   * @internal Whether the row is on the menu page that is showing.
   *
   * Set by the menu, and a property rather than an attribute for that reason.
   * Public because the menu has to reach it, and not something a consumer
   * writes: which page is open is the menu's business.
   */
  @property({ attribute: false })
  onPage = true

  /**
   * The link's `rel`. Set it whenever you set `target="_blank"`.
   */
  @property()
  rel = ''

  /**
   * The row's keyboard shortcut as a chord, such as `mod+s`, shown after the
   * label in the platform's glyphs and given to the row as
   * `aria-keyshortcuts`. `mod` is Command on an Apple keyboard and Control
   * elsewhere. Showing a shortcut does not bind it.
   */
  @property()
  shortcut = ''

  /**
   * @internal Whether the page showing is this row's submenu, or one below it.
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
   * Where the link opens, for rows that should open outside the current page.
   */
  @property()
  target = ''

  /**
   * The row's value, sent in `helix-select` when the row is chosen.
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
   * Whether anything is slotted into `submenu`.
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

  /** Whether anything is slotted after the label, read the way `start` is. */
  @state()
  private end = false

  /**
   * Both answers, from the children, before each render.
   *
   * The slots exist only once a render has made them: read through them, the
   * first render drew no caret and no leading box and a second render had to
   * follow it. `slotchange` still reads them, for a child that arrives later.
   * Not on the server, where `children` is undefined, nor while hydrating what
   * one sent.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('checked', this.checked)
    if (!this.childrenKnown) {
      return
    }
    const named = (name: string): boolean => this.knownChildren.some((child) => child.slot === name)
    this.submenu = named('submenu')
    this.start = named('start')
    this.end = named('end')
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
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

  /** Re-reads whether anything is after the label, as `readStart` does before it. */
  private readonly readEnd = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="end"]')
    this.end = (slot?.assignedNodes().length ?? 0) > 0
  }

  /**
   * The trailing column: the shortcut's key, then whatever is slotted in `end`.
   * Drawn by `Kbd`, interpolated so each tier draws its own.
   *
   * The key is hidden from the accessibility tree, since the row's
   * `aria-keyshortcuts` says it in words a screen reader reads as keys: inside
   * the row its glyphs became part of the row's name.
   */
  protected renderEnd(): TemplateResult {
    const kbd = this.tag('kbd')
    return html`<span part="end" ?data-empty=${!this.end && this.shortcut === ''}
      >${
        this.shortcut === ''
          ? nothing
          : staticHtml`<${kbd}
              part="shortcut"
              exportparts="kbd: shortcut-kbd"
              aria-hidden="true"
              keys=${this.shortcut}
            ></${kbd}>`
      }<slot name="end" @slotchange=${this.readEnd}></slot
    ></span>`
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
    this.partNamed('item')?.focus()
  }

  /**
   * Moves focus to the row. Part of `NavigableItem`, which the shared keyboard
   * controller uses for the arrow keys.
   *
   * `focus()` above already puts focus on the control inside the row rather than
   * on the row, which is the whole of what moving here means.
   */
  focusItem(): void {
    this.focus()
  }

  /** Chooses the row, the same as pressing it. */
  select(): void {
    this.choose()
  }

  /**
   * Whether the row has focus, which makes it the row the keyboard is on.
   *
   * `Option` calls the same thing `active`. A menu holds no answer the way a
   * radio group does, only a row the reader has walked to, so focus is the
   * whole of what "the current one" can mean here. Read from the shadow root
   * rather than kept as state, because focus moves for reasons this element is
   * not told about: a press, a Tab, the drilldown putting the reader on the
   * first row of a page it has just opened.
   */
  get active(): boolean {
    /* The focused node itself, found through every shadow root, and asked
       whether it is in this row's own. `document.activeElement` stops at the
       outermost host, which is this row only while the menu is in the document
       tree: inside another component's shadow root it is that component, and
       no row was ever current. A row holding a submenu is not current while a
       row of that submenu has focus, which a containment test would say it
       was. */
    const active = deepActiveElement()
    return active !== null && active.getRootNode() === this.renderRoot
  }

  /**
   * Whether the row has focus, the same as `active`.
   *
   * @deprecated Read `active`. Everywhere else in the library `selected` means
   * chosen out of a set, and a menu row is never chosen that way.
   */
  get selected(): boolean {
    return this.active
  }

  /**
   * Checks or unchecks a choice row.
   *
   * An `exclusive` row only turns on, and turning on turns its set off.
   */
  private tick(): void {
    if (!(this.checkable || this.checked) || this.hasSubmenu) {
      return
    }
    const next = this.exclusive ? true : !this.checked
    if (next === this.checked) {
      return
    }
    const applied = requestChange({
      apply: (checked) => {
        this.checked = checked
      },
      event: (checked) => new HelixBeforeToggleEvent({ checked }),
      host: this,
      next,
    })
    if (applied && this.exclusive) {
      for (const peer of this.exclusivePeers()) {
        peer.checked = false
      }
    }
  }

  /** The other `exclusive` rows in this row's run of siblings. */
  private exclusivePeers(): HelixHeadlessMenuItem[] {
    const peers: HelixHeadlessMenuItem[] = []
    const inSet = (node: Element | null): node is HelixHeadlessMenuItem =>
      node !== null &&
      (node as Partial<HelixHeadlessMenuItem>).isMenuItem === true &&
      (node as HelixHeadlessMenuItem).exclusive &&
      node.slot === this.slot
    for (const step of ['previousElementSibling', 'nextElementSibling'] as const) {
      let node = this[step]
      while (inSet(node)) {
        peers.push(node)
        node = node[step]
      }
    }
    return peers
  }

  private choose(): void {
    if (this.disabled) {
      return
    }
    this.tick()
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
    const ticks = this.checkable || this.checked
    const role = ticks ? (this.exclusive ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem'
    const checkedState = ticks ? (this.checked ? 'true' : 'false') : nothing
    /* In this reader's platform's words, and in the server's while hydrating
       what one sent, which has no keyboard to ask. */
    const keys =
      this.shortcut === '' ? nothing : ariaChord(this.shortcut, !this.hydrating && onApple())
    const inside = html`<span part="start" ?data-empty=${!this.start}
          ><slot name="start" @slotchange=${this.readStart}></slot
        ></span>
        <slot></slot>
        ${this.renderEnd()}
        ${
          // One trailing column, and a row is never both: a way into a page has
          // nothing to tick, and a choice opens nothing. The tick sits after the
          // label rather than before it, so the labels start at the edge of the
          // row and the marks line up down the side they are read from.
          //
          // `data-mirror` is what tells the two apart. They share a part name
          // because they share a column, and only one of them is directional: a
          // caret has to mirror in a right-to-left document and a tick must not,
          // which Unicode's own mirroring list agrees on. The attribute is on an
          // element in this shadow root rather than on the host, so it is the
          // divider's `data-empty` and not a hydration hazard.
          submenu
            ? html`<svg
                part="mark"
                data-mirror
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
            aria-keyshortcuts=${keys}
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
            aria-keyshortcuts=${keys}
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
