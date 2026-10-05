import {
  AriaForwardController,
  customElement,
  DrilldownController,
  HelixElement,
  inlineStep,
  KeyboardNavigationController,
  keyClaimed,
  MixinCollection,
  type NavigableItem,
  slottedWords,
} from '@fusion.dev/helix-core'
import { caretLeft } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessDrilldownItem } from '../item/drilldown-item.js'

/**
 * @summary A stack of pages that shows one at a time, with a back button.
 *
 * @description
 * One panel whose content changes as you move between pages. Use it where there
 * is no room for a second column, such as on a phone, or on a touch screen with
 * no hover to open one.
 *
 * It is a region that stays where you put it, such as inside a drawer, a
 * sidebar, or a settings panel. A `Menu` opens from a trigger and closes when
 * you are done. `Menu` can drill into pages too, through the same controller.
 *
 * Rows are places to go and commands to run. Nothing here is form-associated
 * and nothing is submitted. To choose a value, use a `Listbox`.
 *
 * A row that opens a page contains that page, so the stack holds one reference
 * and reads the rest from the DOM. The behavior lives in `DrilldownController`,
 * which `Menu` shares.
 *
 * After each move the host carries `data-direction`, `forward` into a page or
 * `back` out of one, so a stylesheet can slide the new page in from the side
 * the reader is going. The styled tier does, and holds still under reduced
 * motion.
 *
 * The rows of the page showing are a `menu`, named by `label` on the top page
 * and by the page's title below it. The back button and the title sit above
 * the menu. Disabled rows stay reachable with the arrow keys, and typing a
 * letter moves to the next row whose name starts with it.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Panel, Nested list, Drill-in
 * @documentation https://fusion.dev/helix/components/drilldown
 *
 * @slot - The rows of the top page.
 * @slot back-icon - Replaces the icon on the back button.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a row with no page is chosen. Cancelable: canceling it stops the change and leaves the decision to you.
 *
 * @csspart back - The button that goes back one page.
 * @csspart back-mark - The icon on the back button.
 * @csspart empty - Shown when there are no entries to show.
 * @csspart header - The bar above a page, which holds the back button and the page's name.
 * @csspart live - A copy of the empty and loading text, in a region that screen readers announce when it changes. Visually hidden in the styled tier.
 * @csspart loading - Shown while the entries load.
 * @csspart page - The menu the rows are in.
 * @csspart title - The name of the page showing.
 *
 * @cssstate drilled - A row's page is showing, so a frame around the drilldown can style itself for that depth.
 */
@customElement('helix-headless-drilldown')
export class HelixHeadlessDrilldown extends MixinCollection(HelixElement) {
  /**
   * The name of the top page's menu, read by screen readers. A page below it is
   * named by its title.
   *
   * An `aria-label` or `aria-labelledby` on the host names the top page too,
   * and wins over this.
   */
  @property()
  /* Not "Menu". This component's own description is built around not being one,
     and a default accessible name is the one place that claim reaches a
     reader. */
  label = 'Navigation'

  /**
   * The text of the back button.
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

  /**
   * The rows on the page showing, which is what the keys move over.
   *
   * Disabled rows included. A row renders `aria-disabled` and keeps its
   * `tabindex` so a reader can reach it and hear why it cannot be chosen, and
   * `select()` is what refuses it.
   */
  private get items(): HelixHeadlessDrilldownItem[] {
    return this.drilldown.rows
  }

  /** Carries a host `aria-label` and `aria-labelledby` to the menu. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('page'),
  })

  /**
   * Moving between rows, which is `Menu`'s arrangement and not a second one.
   *
   * The horizontal pair is reserved rather than released: in a drill-down they
   * are the platform's own bindings for drilling, along the line to go in and
   * back along it to come out, so they are spoken for here rather than
   * unhandled. `handleKeydown` below owes them a binding, which is what
   * reserving one means, and it has them.
   *
   * `selects` false, because arriving at a row must not follow it. Moving and
   * choosing are one act in a radio group and two here, which is the same
   * reading `Menu` takes over the same rows.
   *
   * The origin is the selection, which for these rows is where focus is. `focus`
   * is the wrong reading however right it looks: it also carries a rule that a
   * press which did not come from the set moves nothing, and Down on a page a
   * reader has just tabbed to is how they get onto the first row at all.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    /* Each row as one the controller never skips, which it does for any item
       that says it is disabled. See `items`. */
    items: () =>
      this.items.map((item): NavigableItem & { words: string } => ({
        contains: (node) => item.contains(node),
        disabled: false,
        focusItem: () => item.focusItem(),
        select: () => item.select(),
        get selected() {
          return item.active
        },
        words: slottedWords(item, ['']),
      })),
    reserved: () => ['ArrowLeft', 'ArrowRight'],
    selects: () => false,
    typeahead: (item) => (item as NavigableItem & { words: string }).words,
  })

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
   * Goes back one page, and returns whether there was a page to go back to.
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
    if (item) {
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
       had to tell them apart would be doing the stack's job.

       **And only if the choice stood**, which is the whole of what makes the
       row's `helix-select` refusable: the drill is the one thing in the library
       that acts on it, so a refusal nothing read left the stack moving anyway.
       The stop stays synchronous, the decision does not: this listener is in
       capture and the dispatch is synchronous, so a microtask is after every
       listener that was going to run. Capture is also who can refuse. Stopping
       here keeps the event off the row and off this host, so the refusal has to
       come from a capture listener above the drilldown, which is the same
       position the stop itself is argued from below. */
    if (this.drilldown.hasPage(item)) {
      event.stopPropagation()
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          this.enter(item)
        }
      })
    }
  }

  /* Only the keys that drill. Moving within a page belongs to the controller
     declared above, which reserves the horizontal pair for exactly this. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* Not a press a field on the page answers: a filter above a list moves its
       caret with the arrows, and going back on one took the page away from a
       reader who was only editing what they had typed. Escape is no field's, so
       it still goes back unless something answered it. */
    if (event.defaultPrevented || (event.key !== 'Escape' && keyClaimed(event))) {
      return
    }
    const items = this.items
    const current = items.findIndex((item) => item.matches(':focus-within'))

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
    /* The depth, said where a stylesheet outside can read it. `Menu` records
       the same fact under the same name and for the same reason: a `data-`
       mirror on the host is markup the server never sent, and this one was read
       by nothing and documented nowhere, so it was the mirror without even the
       consumer the exception is for. */
    this.toggleState('drilled', !this.drilldown.atRoot)
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

  /**
   * The back button's icon, as the `back-icon` slot's fallback, so an icon of
   * your own replaces it by being slotted.
   */
  protected renderBackIcon(): TemplateResult {
    return html`<slot name="back-icon" aria-hidden="true"
      ><svg part="back-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
        ${unsafeSVG(caretLeft.content)}
      </svg></slot
    >`
  }

  protected override render(): TemplateResult {
    return html`${
      this.drilldown.atRoot
        ? ''
        : html`<div part="header">
            <button part="back" type="button" aria-label=${this.backLabel} @click=${() => this.back()}>
              ${this.renderBackIcon()}
            </button>
            <span id="title" part="title">${this.drilldown.label}</span>
          </div>`
    }
      <div
        aria-busy=${this.loading ? 'true' : nothing}
        aria-label=${this.drilldown.atRoot ? this.label || nothing : nothing}
        aria-labelledby=${this.drilldown.atRoot ? nothing : 'title'}
        part="page"
        role="menu"
      >
        <slot @slotchange=${(event: Event) => this.countRows(event)}></slot>
        ${this.renderStatus(this.hasRows)}
      </div>${this.renderLive(this.hasRows)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-drilldown': HelixHeadlessDrilldown
  }
}
