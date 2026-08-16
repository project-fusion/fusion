import { customElement, DrilldownController, HelixElement, hostAria } from '@helix-io/core'
import { caretLeft } from '@helix-io/icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixBaseDrilldownItem } from '../item/drilldown-item.js'

/**
 * @summary A stack of pages, one showing at a time, with a way back.
 *
 * @description
 * One panel that changes rather than panels opening beside each other. That is
 * the right shape wherever there is no room for a second column: a phone has
 * none, and a touch screen has no hover to open one with.
 *
 * **Not a `Menu`, and the difference is what it is for rather than how it
 * looks.** A menu is a thing that opens from a trigger and closes when it is
 * done; this is a region that sits where it is put, inside a drawer or a
 * sidebar or a settings panel. `Menu` drills too, through the same controller,
 * because a menu deep enough to need pages wants exactly this behaviour without
 * being this component.
 *
 * **Navigation, never a value.** Rows are places to go and commands to run, so
 * nothing here is form-associated and nothing is submitted. A drill-down that
 * reported a value would be a `Listbox` whose options happen to nest, and that
 * is the component to reach for instead.
 *
 * **The tree is the state.** A row that opens a page contains that page, so the
 * stack holds one reference and reads the rest from the DOM. See
 * `DrilldownController`, which is where this behaviour lives and which `Menu`
 * shares.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://helix.fusion.dev/components/drilldown
 *
 * @slot - The rows of the top page.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a row with no page is chosen.
 *
 * @csspart header - The bar above a page, holding the way back and its name.
 * @csspart back - The control that returns one page.
 * @csspart title - The name of the page showing.
 * @csspart page - The region the rows are in.
 */
@customElement('helix-base-drilldown')
export class HelixBaseDrilldown extends HelixElement {
  /** Accessible name for the region. */
  @property()
  label = 'Menu'

  /** What the control returning from a page reads. */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Which way the last move went, for whatever animates the change.
   *
   * Reflected as `data-direction`, because the styled tier cannot know it: both
   * moves replace one page with another, and only the stack knows whether the
   * reader went deeper or came back. Without it a slide has to pick one
   * direction and be wrong half the time.
   */
  @state()
  private direction: 'back' | 'forward' = 'forward'

  private readonly drilldown = new DrilldownController<HelixBaseDrilldownItem>(this, {
    isRow: (element: Element): boolean =>
      'isDrilldownItem' in element && element.isDrilldownItem === true,
    root: () => [...this.children],
    slot: 'page',
  })

  /** The rows on the page showing, which is what the keys move over. */
  private get items(): HelixBaseDrilldownItem[] {
    return this.drilldown.rows.filter((item) => !item.disabled)
  }

  /** Shows a row's page, and puts focus on the first row of it. */
  private enter(item: HelixBaseDrilldownItem): void {
    if (!this.drilldown.enter(item)) {
      return
    }
    this.direction = 'forward'
    this.updateComplete.then(() => this.items[0]?.focusItem())
  }

  /**
   * Returns one page, and reports whether there was one to return to.
   *
   * Focus lands on the row that opened the page being left, which is why the
   * row is read before going back rather than after: a reader who drills in and
   * comes straight out should be on the row they pressed, not at the top of a
   * list they have already read.
   */
  back(): boolean {
    const leaving = this.drilldown.page
    if (!this.drilldown.back()) {
      return false
    }
    this.direction = 'back'
    this.updateComplete.then(() => leaving?.focusItem())
    return true
  }

  private readonly handleSelect = (event: Event): void => {
    const item = event.target
    if (!(item instanceof HelixBaseDrilldownItem) || !this.items.includes(item)) {
      return
    }
    /* A row with a page drills rather than announcing. The event is stopped so
       a consumer listening for a choice does not hear navigation as one: going
       somewhere and choosing something are different acts, and a consumer that
       had to tell them apart would be doing the stack's job. */
    if (this.drilldown.hasPage(item)) {
      event.stopPropagation()
      this.enter(item)
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const items = this.items
    const current = items.findIndex((item) => item.matches(':focus-within'))

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (current + step + items.length) % Math.max(items.length, 1)
      items[current === -1 ? 0 : next]?.focusItem()
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      ;(event.key === 'Home' ? items[0] : items[items.length - 1])?.focusItem()
      return
    }
    /* Left and Escape both go back, and neither closes anything: this is a
       region rather than an overlay, so there is nothing above it to close. */
    if (event.key === 'ArrowLeft' || event.key === 'Escape') {
      if (this.back()) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (event.key === 'ArrowRight' && current !== -1) {
      const item = items[current]
      if (item && this.drilldown.hasPage(item)) {
        event.preventDefault()
        this.enter(item)
      }
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Capture, and that is not a detail. A consumer listens on this host too,
       so a bubble-phase listener here is a sibling of theirs: `stopPropagation`
       does nothing to another listener on the same node, and whether the
       navigation is swallowed comes down to which was registered first.
       Capture reaches the host before the row it came from, so stopping there
       stops it for everyone, whatever order anybody bound in. */
    this.addEventListener('helix-select', this.handleSelect, true)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect, true)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'menu' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Which rows are on the page showing, written onto the rows themselves
       because only the stack knows: a row cannot see its own depth. Client
       only, since the server has no tree to walk. */
    const page = this.drilldown.page
    for (const child of this.children) {
      if (!(child instanceof HelixBaseDrilldownItem)) {
        continue
      }
      this.mark(child, page, page === null)
    }
    this.toggleAttribute('data-drilled', !this.drilldown.atRoot)
    this.setAttribute('data-direction', this.direction)
  }

  /** Walks the tree marking which rows are on the page showing. */
  private mark(
    item: HelixBaseDrilldownItem,
    page: HelixBaseDrilldownItem | null,
    onPage: boolean,
  ): void {
    item.onPage = onPage
    item.showingPage = item === page
    for (const child of item.children) {
      if (child instanceof HelixBaseDrilldownItem && child.slot === 'page') {
        this.mark(child, page, item === page)
      }
    }
  }

  protected override render(): TemplateResult {
    return html`${
      this.drilldown.atRoot
        ? ''
        : html`<div part="header">
            <button part="back" type="button" aria-label=${this.backLabel} @click=${() => this.back()}>
              <svg fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                ${unsafeSVG(caretLeft.content)}
              </svg>
            </button>
            <span part="title">${this.drilldown.label}</span>
          </div>`
    }
      <div part="page"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-drilldown': HelixBaseDrilldown
  }
}
