import {
  customElement,
  DrilldownController,
  HelixElement,
  hostAria,
  inlineStep,
  MixinCollection,
} from '@fusion.dev/helix-core'
import { caretLeft } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessDrilldownItem } from '../item/drilldown-item.js'

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
 * because a menu deep enough to need pages wants exactly this behavior without
 * being this component.
 *
 * **Navigation, never a value.** Rows are places to go and commands to run, so
 * nothing here is form-associated and nothing is submitted. A drill-down that
 * reported a value would be a `Listbox` whose options happen to nest, and that
 * is the component to reach for instead.
 *
 * **The tree is the state.** A row that opens a page contains that page, so the
 * stack holds one reference and reads the rest from the DOM. See
 * `DrilldownController`, which is where this behavior lives and which `Menu`
 * shares.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://helix.fusion.dev/components/drilldown
 *
 * @slot - The rows of the top page.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a row with no page is chosen. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart back - The control that returns one page.
 * @csspart back-mark - The glyph on the back control.
 * @csspart empty - Shown when there are no entries to show.
 * @csspart header - The bar above a page, holding the way back and its name.
 * @csspart loading - Shown while the entries are still on their way.
 * @csspart page - The region the rows are in.
 * @csspart title - The name of the page showing.
 */
@customElement('helix-headless-drilldown')
export class HelixHeadlessDrilldown extends MixinCollection(HelixElement) {
  /**
   * Accessible name for the region.
   */
  @property()
  /* Not "Menu". This component's own description is built around not being one,
     and a default accessible name is the one place that claim reaches a
     reader. */
  label = 'Navigation'

  /**
   * What the control returning from a page reads.
   */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Which way the last move went, for whatever animates the change.
   *
   * Reflected as `data-direction`, because the styled tier cannot know it: both
   * moves replace one page with another, and only the stack knows whether the
   * reader went deeper or came back. Without it a slide has to pick one
   * direction and be wrong half the time.
   *
   * **Undefined until a move has happened**, and never defaulted. A value
   * written on the first update puts an attribute on the host that a consumer's
   * server never sent, reported as a hydration mismatch, and animates the first
   * page in on load: an animation is not a transition, so the settle guard does
   * not suppress it.
   */
  @state()
  private direction?: 'back' | 'forward'

  private readonly drilldown = new DrilldownController<HelixHeadlessDrilldownItem>(this, {
    isRow: (element: Element): boolean =>
      'isDrilldownItem' in element && element.isDrilldownItem === true,
    root: () => [...this.children],
    slot: 'page',
  })

  /** The rows on the page showing, which is what the keys move over. */
  private get items(): HelixHeadlessDrilldownItem[] {
    return this.drilldown.rows.filter((item) => !item.disabled)
  }

  /**
   * Puts the region's one tab stop on the first row of the page showing.
   *
   * One row holds the stop and the arrows move within, which is the roving
   * pattern the toolbar uses and the one a `menu` wants. Every row at `-1` is
   * a region the keyboard cannot get into at all without a pointer first.
   *
   * Called after every update, because the set changes with the page: drilling
   * in replaces the rows outright, and the stop has to land on rows that are
   * actually showing.
   */
  private placeTabStop(): void {
    const items = this.items
    const held = items.find((item) => item.focusable)
    const stop = held ?? items[0]
    for (const item of this.drilldown.rows) {
      item.focusable = item === stop
    }
  }

  /** Shows a row's page, and puts focus on the first row of it. */
  private enter(item: HelixHeadlessDrilldownItem): void {
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

  /* The stop follows the reader. Arrowing to a row and tabbing away and back
     should return to where they were, not to the top of the page. */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const item = this.drilldown.rows.find((row) => row.contains(event.target as Node))
    if (item && !item.disabled) {
      for (const row of this.drilldown.rows) {
        row.focusable = row === item
      }
    }
  }

  private readonly handleSelect = (event: Event): void => {
    const item = event.target
    if (!(item instanceof HelixHeadlessDrilldownItem) || !this.items.includes(item)) {
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
    /* Back along the line and Escape both go back, and neither closes
       anything: this is a region rather than an overlay, so there is nothing
       above it to close. On a right-to-left page back is the right arrow and in
       is the left, which is where a row's caret points. */
    const along = inlineStep(this, event.key)
    if (along === -1 || event.key === 'Escape') {
      if (this.back()) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (along === 1 && current !== -1) {
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
    this.addEventListener('focusin', this.handleFocusIn)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect, true)
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
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
      if (!(child instanceof HelixHeadlessDrilldownItem)) {
        continue
      }
      this.mark(child, page, page === null)
    }
    this.placeTabStop()
    this.toggleAttribute('data-drilled', !this.drilldown.atRoot)
    if (this.direction === undefined) {
      this.removeAttribute('data-direction')
    } else {
      this.setAttribute('data-direction', this.direction)
    }
  }

  /** Walks the tree marking which rows are on the page showing. */
  private mark(
    item: HelixHeadlessDrilldownItem,
    page: HelixHeadlessDrilldownItem | null,
    onPage: boolean,
  ): void {
    item.onPage = onPage
    item.showingPage = item === page
    for (const child of item.children) {
      if (child instanceof HelixHeadlessDrilldownItem && child.slot === 'page') {
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
              <svg part="back-mark" fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                ${unsafeSVG(caretLeft.content)}
              </svg>
            </button>
            <span part="title">${this.drilldown.label}</span>
          </div>`
    }
      <div aria-busy=${this.loading ? 'true' : nothing} part="page">
        <slot @slotchange=${(event: Event) => this.countRows(event)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-drilldown': HelixHeadlessDrilldown
  }
}
