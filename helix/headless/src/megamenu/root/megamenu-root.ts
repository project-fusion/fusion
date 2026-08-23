import {
  anchorElement,
  customElement,
  HelixElement,
  MixinControllerOpen,
  PopoverController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * The panel showing now, so opening one closes the last.
 *
 * A page has one of these open at a time: a nav bar whose Products panel is
 * still down while Solutions opens is a nav bar with two panels over the page.
 * Module scope rather than a coordinating parent, because there is nothing to
 * coordinate through: these sit in whatever container the consumer used, which
 * is usually `helix-navigation` and is not required to be. `Video` holds the
 * media session the same way and for the same reason.
 */
let showing: HelixBaseMegamenu | undefined

/**
 * @summary A section of a navigation that opens a panel of destinations.
 *
 * @description
 * **A disclosure, not a menu, and that is the whole design.** `role="menu"` and
 * `menuitem` are for an application's commands: they take over the arrow keys,
 * announce "menu" to a reader who asked for navigation, and put every link
 * inside a role that is not a link. What this is, is a button that shows and
 * hides a region of the consumer's own anchors, which is the pattern the APG
 * gives for site navigation and the one that leaves a middle click, a modified
 * click and the status bar working. `Menu` remains right for a row of commands.
 *
 * **It renders no links**, for the reason `Navigation` gives: a router renders
 * its own anchor and cannot render one inside this shadow root. The panel is a
 * slot, and what goes in it is lists and headings the consumer wrote.
 *
 * **It opens on hover, and a press is always the fallback.** `open-on` says
 * which, and hover is the resting value because a nav bar is the one place a
 * reader expects to sweep along a row and see each section: making them click,
 * read, click again to compare two is the interaction hover exists to save.
 *
 * Hover is not the only way in, and the code is mostly about that. There is no
 * hover on a touch screen, so a tap opens the panel there whatever `open-on`
 * says, which is why the pointer type is checked rather than assumed. Focus
 * still opens nothing, for the same reason a tab through a nav bar should not
 * unfold it, but Enter on the trigger does, and a keyboard press arrives as a
 * click with no pointer behind it.
 *
 * A mouse click on a trigger the pointer is already sitting on is the case
 * worth naming: toggling there would close the panel and the pointer, still on
 * the trigger, would open it again, so the trigger would flicker and never
 * close. In hover mode the mouse's own clicks are left alone and hover governs
 * on its own. Escape and a click away still close it.
 *
 * The delays are intent, not decoration. Opening waits, so a pointer crossing
 * the bar on its way somewhere else opens nothing; closing waits longer, so the
 * diagonal from the trigger down into the panel does not pass through a gap and
 * shut it. Moving along a bar where a panel is already down opens the next one
 * at once, because at that point the reader is reading the bar, not crossing it.
 *
 * **Focus is not trapped and not moved.** A disclosure leaves the reader on the
 * trigger and the panel follows in the tab order, which is what the markup
 * already says, so Tab walks into the links and out the far side without
 * anything managing it. Escape closes and puts focus back, because Escape is
 * the one key that has to return the reader to where they were.
 *
 * The properties below are written by this component and read by whoever draws
 * it. A consumer sets none of them: they carry a number this element computed
 * and CSS cannot, which is what lets a stylesheet on this tier draw the thing
 * without measuring anything itself.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu, Flyout, Nav panel
 * @documentation https://helix.fusion.dev/components/megamenu
 *
 * @slot - The panel's contents: the consumer's own lists and headings.
 * @slot trigger - The control that opens it. Falls back to a button named by `label`.
 *
 * @csspart trigger - The default trigger, where none was slotted.
 * @csspart panel - The region that opens.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 *
 * @cssproperty --megamenu-top - Where the panel starts, measured from the bar above it.
 */
@customElement('helix-base-megamenu')
export class HelixBaseMegamenu extends MixinControllerOpen(HelixElement) {
  /** The section's name, which names the default trigger and the panel. */
  @property()
  label = ''

  /**
   * Whether the panel is a card under the trigger or a band across the page.
   *
   * The resting one is the card, hanging off the trigger and as wide as it
   * needs to be. `full` is the other shape navigations use: a band from edge to
   * edge under the header, with its contents held to the page's own measure, so
   * a set of destinations too wide to sit under one word gets the whole width
   * to lay out in.
   *
   * It changes where the panel goes as well as how it looks, which is why this
   * tier knows about it at all: a band spans the viewport, so there is nothing
   * to measure it against and nothing to flip or shift to, and the placing pass
   * is told not to run. Everything else the popover gives, the top layer and
   * the dismissal, is exactly what such a band needs.
   */
  @property({ reflect: true })
  variant?: 'full'

  /**
   * Whether hovering the trigger opens the panel, or only a press does.
   *
   * A press always works. This says whether a mouse also opens it by resting on
   * the trigger, and it is the default because that is what a navigation bar
   * does. `click` is for a trigger that does something else as well, or a panel
   * heavy enough that opening it on the way past is rude.
   */
  /* Read, never written back. It has a default, and a reflected default puts an
     attribute on the host that the consumer did not write, which the server
     then ships: the SSR spec for this element checks exactly that and caught
     it. Nothing selects on it, so there is nothing to reflect for. */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'hover' = 'hover'

  /**
   * The width, in pixels, under which a card becomes a band. Zero never does.
   *
   * A card is a panel hung off one word, and there is no room to hang anything
   * off a word on a phone: the columns do not shrink past
   * `--megamenu-column-size`, so four of them stay four of them and the panel
   * runs off the side of the screen rather than reflowing. Below this it takes
   * the whole width and its columns stack, which is the only arrangement that
   * fits.
   *
   * **In script rather than a media query, and only once.** Whether the panel is
   * a band is not a question of paint: a band is not placed against the trigger,
   * so the controller has to be told not to measure, and that decision is here
   * whatever the stylesheet says. Writing the width in both places would be one
   * number in two languages, drifting the first time either moved. This sets
   * `data-narrow` on the host and the stylesheet arranges itself off that.
   */
  @property({ attribute: 'full-below', type: Number })
  fullBelow = 640

  @state()
  private narrow = false

  private query: MediaQueryList | undefined

  /** A band, whether because it was asked for or because there is no room. */
  private get banded(): boolean {
    return this.variant === 'full' || this.narrow
  }

  private readonly handleWidth = (event: MediaQueryListEvent | MediaQueryList): void => {
    this.narrow = event.matches
  }

  /* Rebuilt rather than kept, because the width is a property and a query
     cannot be edited once it is made. */
  private watchWidth(): void {
    this.query?.removeEventListener('change', this.handleWidth)
    this.query = undefined
    if (!(this.fullBelow > 0) || typeof matchMedia !== 'function') {
      this.narrow = false
      return
    }
    this.query = matchMedia(`(max-width: ${this.fullBelow - 0.02}px)`)
    this.query.addEventListener('change', this.handleWidth)
    this.handleWidth(this.query)
  }

  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, not the panel. A press on the trigger is a press on this
       element, and counting it as outside would close the panel on the way to
       the click that toggles it. `Menu` says the same about its own. */
    boundary: () => this,
    onDismiss: () => this.close(),
    place: () => !this.banded,
    placement: () => 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="panel"]'),
  })

  /** What the consumer slotted, if they slotted anything. */
  private get slotted(): HTMLElement | undefined {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    return slot?.assignedElements({ flatten: false })[0] as HTMLElement | undefined
  }

  /** Whatever the consumer slotted, or the button rendered in its place. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]') ?? this,
    )
  }

  /** Shuts it and puts the reader back where they were. */
  private close(): void {
    if (!this.requestOpen(false)) {
      return
    }
    this.trigger.focus()
  }

  /**
   * Where a full-bleed band starts, which is the only number it needs.
   *
   * The placing pass is off for that appearance, so nothing else is measuring:
   * a band spans the viewport and has only one degree of freedom, how far down
   * it sits, and that is the bottom of the trigger in viewport coordinates
   * because the panel is fixed. A header that scrolls takes the band with it,
   * which is what a panel hanging off a header should do.
   *
   * Written as a custom property rather than an inline `top`, so the stylesheet
   * keeps the arrangement and this contributes the one measurement it cannot
   * make. Nothing to do for the card, which the controller places.
   */
  private band(): void {
    if (!this.banded) {
      return
    }
    this.style.setProperty('--megamenu-top', `${Math.round(this.bar())}px`)
  }

  /**
   * The bottom edge of the bar this hangs from.
   *
   * The trigger's own bottom is the obvious answer and is the wrong one: a
   * header is taller than the word inside it, so a band starting at the word
   * starts partway up the header, over its lower padding and its border.
   * Measured: trigger bottom 44, header bottom 57, thirteen pixels of header
   * with a band drawn across it.
   *
   * **The first ancestor as wide as the window, which is a fact and not a tag
   * name.** A band spans the viewport, so what it should hang from is whatever
   * else does: that is what makes something a bar. Asking for `helix-app-header`
   * by name would make this element know about that one, which is the coupling
   * `Menu` is careful not to have with `Drilldown`, and would leave a consumer
   * who wrote their own header with a band across it.
   *
   * `body` ends the walk. It is as wide as the window and is not a bar, and its
   * bottom is the foot of the page: without the guard a megamenu on a plain page
   * would put its band down there. Nothing found means nothing to hang from, and
   * the trigger is the honest answer again.
   */
  private bar(): number {
    const wide = document.documentElement.clientWidth
    let node = this.parentElement
    while (node && node !== document.body) {
      const box = node.getBoundingClientRect()
      if (Math.round(box.width) >= wide) {
        return box.bottom
      }
      node = node.parentElement
    }
    return this.trigger.getBoundingClientRect().bottom
  }

  /**
   * How long a pointer has to mean it, in milliseconds.
   *
   * Opening is the shorter wait: too long and the panel feels stuck, too short
   * and crossing the bar opens things. Closing is longer because the pointer
   * has to get from the trigger to the panel, and the straight line between
   * them is not the line anybody moves along.
   */
  private static readonly OPEN_DELAY = 120
  private static readonly CLOSE_DELAY = 220

  private timer: ReturnType<typeof setTimeout> | undefined

  /* What pressed last, so a click can be told apart from a tap. A click event
     carries no pointer type of its own. */
  private pointer: string | undefined

  private schedule(delay: number, then: () => void): void {
    this.stop()
    this.timer = setTimeout(then, delay)
  }

  private stop(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  /**
   * Keeps a band under its bar while the page moves, and closes it when the bar
   * goes.
   *
   * The band is fixed and its offset is measured once, when it opens. That is
   * fine until the page scrolls: a header that scrolls away leaves the band
   * pinned where the header used to be, open, in the middle of the page with
   * nothing above it. Measured at a scroll of 300: header bottom at -243 and the
   * band still sitting at 57.
   *
   * The card has none of this, because the floating controller follows its
   * anchor. Turning that off for the band, which has nothing to be placed
   * against, took the scroll handling with it, and this is the half that was
   * still wanted.
   *
   * A sticky bar does not move, so re-measuring returns the same number and the
   * band stays where it is. `requestOpen` rather than `close`, because closing
   * puts focus back on the trigger and a reader who has scrolled away should not
   * be dragged back up to it.
   */
  private readonly handleScroll = (): void => {
    if (!this.open || !this.banded) {
      return
    }
    if (this.bar() <= 0) {
      this.requestOpen(false)
      return
    }
    this.band()
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointer = event.pointerType
  }

  private readonly handlePointerEnter = (event: PointerEvent): void => {
    /* Mouse only. A touch screen synthesises an enter on tap, and acting on it
       would open the panel and then let the click that follows close it again,
       so a tap would do nothing at all. */
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    /* No wait when a panel is already down: the bar is open, and the reader
       moving along it is choosing, not passing through. */
    this.schedule(showing && showing !== this ? 0 : HelixBaseMegamenu.OPEN_DELAY, () => {
      this.requestOpen(true)
    })
  }

  private readonly handlePointerLeave = (event: PointerEvent): void => {
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    this.schedule(HelixBaseMegamenu.CLOSE_DELAY, () => {
      /* Not `close()`: leaving with the pointer should not pull focus back to
         the trigger, which would scroll the page to a nav bar the reader has
         moved on from. Escape is the one that returns them. */
      this.requestOpen(false)
    })
  }

  private readonly handleTriggerClick = (event: MouseEvent): void => {
    this.stop()
    if (this.openOn !== 'hover') {
      this.requestOpen(!this.open)
      return
    }
    /* In hover mode the mouse's own clicks are hover's business. Toggling here
       would close a panel the pointer is still standing on, and the pointer
       would reopen it. A keyboard press arrives with no clicks behind it, and a
       tap arrives with a pointer that is not a mouse: both are the only way in
       for the people making them, so both toggle. */
    if (event.detail === 0 || (this.pointer !== undefined && this.pointer !== 'mouse')) {
      this.requestOpen(!this.open)
    }
  }

  /**
   * Shuts the panel when a reader takes one of the destinations in it.
   *
   * Nothing closed it before, so a click navigated and left the panel hanging
   * over wherever the reader landed. With a router that navigates in place, and
   * this is one, that is a panel covering the page it was asked to go to.
   *
   * **A modified click leaves it open**, which is the same position this
   * element already takes on middle clicks and the status bar: `cmd` on a link
   * opens a tab behind this page rather than navigating it, so the reader is
   * still standing in the menu and collecting, and shutting it under them would
   * make the second choice cost a second open.
   *
   * `requestOpen(false)` rather than `close()`, for the reason `pointerleave`
   * gives: the trigger is not where the reader is going, and pulling focus back
   * to a nav bar they have just left is a scroll they did not ask for.
   *
   * **On the host rather than on the panel**, which is the same reason the
   * pointer handlers give and one more. A row is slotted light DOM and the
   * panel is in the shadow root, so a click only reaches the panel through the
   * flattened tree: real ones do, and a DOM that does not implement slot
   * propagation never delivers it, which makes every case here pass by never
   * running this at all. The host is the row's own ancestor in both.
   */
  private readonly handleContentClick = (event: MouseEvent): void => {
    if (!this.open || event.defaultPrevented || event.button !== 0) {
      return
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return
    }
    /* Asking for the destination rather than for any click, so the headings,
       the gaps between rows and a reader's stray click on the panel's own
       padding leave it where it is. */
    const target = event.target as Element | null
    const chosen = target?.closest?.('a[href], button:not([disabled]), [role="menuitem"]')
    /* Inside this element and not the trigger. A press on the trigger is the
       trigger's to answer, and a shadow-rendered one retargets to the host, so
       `closest` there climbs past this element entirely. */
    if (!chosen || !this.contains(chosen) || chosen.closest('[slot="trigger"]')) {
      return
    }
    this.requestOpen(false)
  }

  /* On the host, and here rather than in the template, because Lit templates
     bind inside a shadow root and these have to hear the panel too. Not the
     constructor: the server runs that and has no events. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.watchWidth()
    /* On the window and capturing, so a band over a scrolling panel hears that
       too rather than only the page's own scrolling. Passive: this measures and
       never prevents. */
    addEventListener('scroll', this.handleScroll, { capture: true, passive: true })
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('click', this.handleContentClick)
    this.addEventListener('pointerenter', this.handlePointerEnter)
    this.addEventListener('pointerleave', this.handlePointerLeave)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    removeEventListener('scroll', this.handleScroll, { capture: true })
    this.query?.removeEventListener('change', this.handleWidth)
    this.query = undefined
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('click', this.handleContentClick)
    this.removeEventListener('pointerenter', this.handlePointerEnter)
    this.removeEventListener('pointerleave', this.handlePointerLeave)
    this.stop()
    if (showing === this) {
      showing = undefined
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('fullBelow')) {
      this.watchWidth()
    }
    /* The one thing the stylesheet cannot work out for itself, since the
       breakpoint is declared up here. */
    this.toggleAttribute('data-narrow', this.narrow)
    /* A slotted trigger gets the disclosure state too.
     
       `render` writes `aria-expanded` and `aria-controls` onto the button it
       renders itself, and a consumer who takes the documented `trigger` slot
       replaces that button and got neither: the panel opened and closed and
       nothing announced it, so a screen reader was told the control was a plain
       button forever. Silent, because the slot works perfectly in every other
       respect and the failure is only audible.
     
       Written here rather than in the template because the element belongs to
       the consumer's tree, which a Lit binding cannot reach. Client only, which
       is where it belongs: `updated` does not run on the server, and the slotted
       button carries no expanded state until there is something to expand. */
    const slotted = this.slotted
    if (slotted) {
      slotted.setAttribute('aria-controls', 'panel')
      slotted.setAttribute('aria-expanded', this.open ? 'true' : 'false')
    }
    if (this.open) {
      /* Before showing this one, so the two are never both up for a frame. The
         other closes through `requestOpen`, so a consumer holding it open is
         asked rather than overruled. */
      if (showing && showing !== this) {
        showing.requestOpen(false)
      }
      showing = this
      this.panel.show()
      this.band()
    } else {
      if (showing === this) {
        showing = undefined
      }
      this.panel.hide()
    }
  }

  /**
   * The control that opens it, behind a seam the styled tier can move.
   *
   * The same case `SpeedDial` records: a bare `<button>` is what this tier can
   * write, `helix-button` lives a tier above, and a render method is how a tier
   * that has one reaches this without reimplementing the panel below it.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}>
      <button
        part="trigger"
        type="button"
        aria-controls="panel"
        aria-expanded=${this.open ? 'true' : 'false'}
      >
        ${this.label}
      </button>
    </slot>`
  }

  protected override render(): TemplateResult {
    /* The listeners sit on the host rather than the trigger, so the panel counts
       as inside it: the top layer changes where the panel is painted and not
       where it is in the tree, so a pointer moving off the trigger and onto the
       panel has not left this element and fires no leave. */
    return html`${this.renderTrigger()}
      <div
        part="panel"
        id="panel"
        popover="manual"
        aria-label=${this.label || nothing}
        role="group"
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-megamenu': HelixBaseMegamenu
  }
}
