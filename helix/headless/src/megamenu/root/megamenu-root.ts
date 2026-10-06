import {
  anchorElement,
  customElement,
  deepContains,
  focusableElements,
  HelixElement,
  KeyboardNavigationController,
  MixinControllerOpen,
  type NavigableItem,
  PopoverController,
  tellDisclosure,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HandOver, type Motion } from '../hand-over.js'

/**
 * @summary A section of a navigation with a trigger that opens a panel of links.
 *
 * @description
 * A disclosure: a button that shows and hides a region of your own links. It
 * does not use `role="menu"` or `menuitem`, which are for application commands.
 * Those roles take over the arrow keys, announce "menu" to someone looking for
 * navigation, and put every link inside a role that is not a link. As a
 * disclosure, middle clicks, modified clicks, and the status bar keep working.
 * Use `Menu` for a row of commands.
 *
 * It renders no links. A router renders its own anchors and cannot render them
 * inside this shadow root, so the panel is a slot for the lists and headings
 * you write.
 *
 * It opens on hover by default, and a press always opens it too. `open-on` sets
 * which. Hover is the default because in a navigation bar people expect to move
 * along the row and see each section.
 *
 * When one panel opens in place of another, each says which way the reader
 * moved, as Radix's `data-motion` does. Moving toward the end of the bar, the
 * one opening is `:state(from-end)` and the one closing is `:state(to-start)`;
 * moving back, they are `:state(from-start)` and `:state(to-end)`. A
 * stylesheet slides them on that. Start and end follow the reading direction,
 * so on a right-to-left page the end is on the left. A panel that opens or
 * closes on its own carries none of the four. A press on another megamenu's
 * trigger hands over the same way as hovering it.
 *
 * While a panel is open its surface carries its own size, as
 * `--megamenu-surface-inline-size` and `--megamenu-surface-block-size`, and a
 * panel that took over from another also carries that one's size, as
 * `--megamenu-from-inline-size` and `--megamenu-from-block-size`. Radix's
 * navigation menu publishes the same pair from its shared viewport, so a
 * stylesheet can grow or shrink one panel into the next.
 *
 * The panel's default slot is the `columns` part and draws no box, so a sheet
 * can give the columns one of their own. While a panel is open, an
 * `indicator` slot is rendered beside its trigger, as Radix's indicator
 * marks the open one: slot a mark of your own, such as a bar or an arrow
 * pointing at the panel, and it shows only while the panel is open. The styled
 * tier rests it on the trigger's bottom edge.
 *
 * Left and Right Arrow move between the triggers of the megamenus beside this
 * one, and Home and End go to the first and the last, as Radix's navigation
 * menu does. In a `Navigation`, which holds them in a slot, the arrows are the
 * navigation's, and move between its destinations under its `arrows`. Down Arrow on the trigger of an open panel moves
 * focus to the panel's first link, Escape closes the panel and returns focus
 * to its trigger, and Tab moves through the panel's links and closes it on the
 * way out. The trigger says `aria-expanded`, and the panel is a group named by
 * `label`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Mega menu, Flyout, Nav panel
 * @documentation https://fusion.dev/helix/components/megamenu
 *
 * @slot - The panel's contents, such as your own lists of links and their headings.
 * @slot indicator - A mark for the open trigger, shown while the panel is open, such as a bar or an arrow pointing at the panel.
 * @slot trigger - The control that opens the panel. When it is empty, a button named by `label` is shown.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The panel is about to close. Cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - The panel is about to open. Cancelable.
 * @event {ToggleEvent} toggle - The panel opened or closed. Carries `newState` and `oldState`.
 *
 * @csspart columns - The panel's default slot. It draws no box until a sheet gives it a `display`.
 * @csspart indicator - The `indicator` slot, rendered while the panel is open.
 * @csspart surface - The floating panel that opens.
 * @csspart trigger - The default trigger button, shown when the `trigger` slot is empty.
 *
 * @cssproperty --megamenu-from-block-size - The height of the panel this one took over from, written on the surface while it is open.
 * @cssproperty --megamenu-from-inline-size - The width of the panel this one took over from, written on the surface while it is open.
 * @cssproperty --megamenu-surface-block-size - The panel's own height, written on the surface while it is open.
 * @cssproperty --megamenu-surface-inline-size - The panel's own width, written on the surface while it is open.
 * @cssproperty --megamenu-top - Where the panel starts, measured from the bar above it.
 *
 * @cssstate from-end - The panel opened in place of one earlier in the bar, so it can enter from the end side.
 * @cssstate from-start - The panel opened in place of one later in the bar, so it can enter from the start side.
 * @cssstate narrow - The page is narrower than `band-below`, so the panel is shown as a band whatever its variant.
 * @cssstate open - The panel is open, and the trigger is shown as current.
 * @cssstate to-end - The panel closed because one earlier in the bar opened, so it can leave toward the end.
 * @cssstate to-start - The panel closed because one later in the bar opened, so it can leave toward the start.
 */
@customElement('helix-headless-megamenu')
export class HelixHeadlessMegamenu extends MixinControllerOpen(HelixElement) {
  /** The bar's one open panel, shared by every megamenu on the page. */
  private static readonly bar = new HandOver<HelixHeadlessMegamenu>((megamenu, to) =>
    megamenu.motion(to),
  )

  /**
   * The page width, in pixels, below which a card panel is shown as a band. At
   * zero, it never is.
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
   * number in two languages, drifting the first time either moved. This records
   * `:state(narrow)` on the host and the stylesheet arranges itself off that.
   *
   * **A custom state and never `data-narrow`, which is what it was.** The width
   * is read in `connectedCallback`, so on a phone this is true on the very first
   * update: an attribute written there is markup a consumer's server never sent,
   * which React reports as a mismatch and answers by rebuilding the subtree. The
   * narrow exception the server specs describe covers a mirror that can only
   * become true long after hydration, and a viewport measured before the first
   * paint is the opposite case. See `MixinControllerOpen` on `open`.
   */
  @property({ attribute: 'band-below', type: Number })
  bandBelow = 640

  /**
   * The section's name, used for the default trigger and the panel.
   */
  @property()
  label = ''

  /**
   * Whether hovering over the trigger opens the panel (`hover`), or only a press
   * does (`click`).
   *
   * A press always works. This says whether a mouse also opens it by resting on
   * the trigger, and it is the default because that is what a navigation bar
   * does. `click` is for a trigger that does something else as well, or a panel
   * heavy enough that opening it on the way past is rude.
   */
  /* Read, never written back. It has a default, and a reflected default puts an
     attribute on the host that the consumer did not write, which the server
     then ships: the SSR spec for this element checks exactly that. Nothing
     selects on it, so there is nothing to reflect for. */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'hover' = 'hover'

  /**
   * Whether the panel is a card under the trigger or a band across the page.
   *
   * The resting one is the card, hanging off the trigger and as wide as it
   * needs to be. `band` is the other shape navigations use: a run from edge to
   * edge under the header, with its contents held to the page's own measure, so
   * a set of destinations too wide to sit under one word gets the whole width
   * to lay out in.
   *
   * **A band and not a width, which is why the word is not `full`.** It changes
   * where the panel goes as well as how wide it is, which is why this tier
   * knows about it at all: a band spans the viewport, so there is nothing to
   * measure it against and nothing to flip or shift to, and the placing pass is
   * told not to run. Everything else the popover gives, the top layer and the
   * dismissal, is exactly what such a band needs. `full` is the registry's word
   * for a width, and `Button` and `Dialog` are the two families answering that
   * question; borrowing it here would put a third meaning on it.
   *
   * `variant` and not an axis, for the reason the registry gives: a card under
   * a word and a band under a header are two arrangements this family has, and
   * no other family is being asked the same question.
   */
  @property({ reflect: true })
  variant?: 'band'

  @state()
  private narrow = false

  private query: MediaQueryList | undefined

  /** A band, whether because it was asked for or because there is no room. */
  private get banded(): boolean {
    return this.variant === 'band' || this.narrow
  }

  private readonly handleWidth = (event: MediaQueryListEvent | MediaQueryList): void => {
    this.narrow = event.matches
  }

  /* Rebuilt rather than kept, because the width is a property and a query
     cannot be edited once it is made. */
  private watchWidth(): void {
    this.query?.removeEventListener('change', this.handleWidth)
    this.query = undefined
    if (!(this.bandBelow > 0) || typeof matchMedia !== 'function') {
      this.narrow = false
      return
    }
    this.query = matchMedia(`(max-width: ${this.bandBelow - 0.02}px)`)
    this.query.addEventListener('change', this.handleWidth)
    this.handleWidth(this.query)
  }

  /* Registered rather than held, the way `ToggleGroup` holds its keys: the
     controller follows `open` on its own, so nothing here talks to it after
     construction, and a private field nothing reads is an unused one. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, not the panel. A press on the trigger is a press on this
       element, and counting it as outside would close the panel on the way to
       the click that toggles it. `Menu` says the same about its own. Every
       other megamenu too: a press on one of them opens it, and opening it
       closes this one with a direction. */
    boundary: () => [...HelixHeadlessMegamenu.bar.connected],
    onDismiss: () => this.close(),
    open: () => this.open,
    place: () => !this.banded,
    placement: () => 'bottom-start',
    surface: () => this.partNamed('surface'),
  })

  /** Tells a slotted trigger the disclosure state, by property. See `tellDisclosure`. */
  private tellTrigger(): void {
    const slotted = this.slotted
    if (slotted) {
      tellDisclosure(slotted, this.open)
    }
  }

  /** What the consumer slotted, if they slotted anything. */
  private get slotted(): HTMLElement | undefined {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    return slot?.assignedElements({ flatten: false })[0] as HTMLElement | undefined
  }

  /** Whatever the consumer slotted, or the button rendered in its place. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this.partNamed('trigger') ?? this,
    )
  }

  /**
   * @internal The control a `Navigation`'s arrow keys move to: the trigger
   * the consumer slotted, or the button drawn in its place.
   */
  get navigationControl(): HTMLElement {
    return this.trigger
  }

  /**
   * The arrows along a bar of megamenus that no component holds in a slot.
   *
   * Each megamenu's trigger is one stop, and a press counts only from a
   * trigger, so an arrow among an open panel's links stays with the panel.
   * Down and Up are reserved: Down enters an open panel. A megamenu whose
   * parent is a component, and so holds it in a slot, passes no stops, so a
   * `Navigation` around it decides the arrows, on or off, for every
   * destination at once.
   */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () =>
      !this.parentElement?.shadowRoot
        ? HelixHeadlessMegamenu.bar.alongside(this).map(
            (megamenu): NavigableItem => ({
              contains: (node) => {
                const control = megamenu.trigger
                return node === control || control.contains(node)
              },
              disabled: false,
              focusItem: () => megamenu.trigger.focus(),
              select: () => {},
              selected: false,
            }),
          )
        : [],
    origin: 'focus',
    reserved: () => ['ArrowDown', 'ArrowUp'],
    selects: () => false,
    wrap: false,
  })

  /**
   * Down Arrow on the trigger of an open panel moves focus to the panel's first
   * link or control, as Radix's navigation menu does.
   */
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown' || !this.open || event.defaultPrevented) {
      return
    }
    const trigger = this.trigger
    if (!event.composedPath().includes(trigger)) {
      return
    }
    const first = focusableElements(this).find(
      (element) => element !== trigger && !element.closest('[slot="trigger"]'),
    )
    if (first) {
      event.preventDefault()
      first.focus()
    }
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
   * else does: that is what makes something a bar. Asking for `AppHeader` by
   * name would make this element know about that one, which is the coupling
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
   * anchor. The band turns that controller off, having nothing to be placed
   * against, and this is the half of it still wanted.
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
    HelixHeadlessMegamenu.bar.press(this)
  }

  private readonly handlePointerEnter = (event: PointerEvent): void => {
    /* Mouse only. A touch screen synthesizes an enter on tap, and acting on it
       would open the panel and then let the click that follows close it again,
       so a tap would do nothing at all. */
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    /* No wait when a panel is already down: the bar is open, and the reader
       moving along it is choosing, not passing through. */
    const showing = HelixHeadlessMegamenu.bar.showing
    this.schedule(showing && showing !== this ? 0 : HelixHeadlessMegamenu.OPEN_DELAY, () => {
      this.requestOpen(true)
    })
  }

  private readonly handlePointerLeave = (event: PointerEvent): void => {
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    this.schedule(HelixHeadlessMegamenu.CLOSE_DELAY, () => {
      /* Not `close()`: leaving with the pointer should not pull focus back to
         the trigger, which would scroll the page to a nav bar the reader has
         moved on from. Escape is the one that returns them. */
      this.requestOpen(false)
    })
  }

  /**
   * Closes the panel when keyboard focus leaves it for the page.
   *
   * Only when focus went somewhere: a `relatedTarget` of null is focus leaving
   * the document, such as a switch to another window, and a reader who comes
   * back expects the panel as they left it. `requestOpen` rather than `close`,
   * because focus has already gone where the reader sent it.
   */
  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null
    if (!this.open || next === null || deepContains(this, next)) {
      return
    }
    /* A press on another megamenu opens that one, which closes this one. */
    const pressed = HelixHeadlessMegamenu.bar.pressed
    if (pressed !== undefined && pressed !== this && deepContains(pressed, next)) {
      return
    }
    this.requestOpen(false)
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
      return
    }
    /* A mouse press that beat the hover's wait opens it now: the wait it
       cleared was about to. */
    if (!this.open) {
      this.requestOpen(true)
    }
  }

  /**
   * Shuts the panel when a reader takes one of the destinations in it.
   *
   * Without this a click navigates and leaves the panel hanging over wherever
   * the reader landed. With a router that navigates in place, that is a panel
   * covering the page it was asked to go to.
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
    HelixHeadlessMegamenu.bar.add(this)
    /* On the window and capturing, so a band over a scrolling panel hears that
       too rather than only the page's own scrolling. Passive: this measures and
       never prevents. */
    window.addEventListener('scroll', this.handleScroll, { capture: true, passive: true })
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('click', this.handleContentClick)
    this.addEventListener('pointerenter', this.handlePointerEnter)
    this.addEventListener('pointerleave', this.handlePointerLeave)
    this.addEventListener('focusout', this.handleFocusOut)
    this.addEventListener('keydown', this.handleKeyDown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.handleScroll, { capture: true })
    this.query?.removeEventListener('change', this.handleWidth)
    this.query = undefined
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('click', this.handleContentClick)
    this.removeEventListener('pointerenter', this.handlePointerEnter)
    this.removeEventListener('pointerleave', this.handlePointerLeave)
    this.removeEventListener('focusout', this.handleFocusOut)
    this.removeEventListener('keydown', this.handleKeyDown)
    HelixHeadlessMegamenu.bar.remove(this)
    this.stop()
  }

  /**
   * Hands the bar's one open panel over before this one is shown.
   *
   * Before the render rather than after it, because the popover controller
   * raises the panel from its own `hostUpdated`, which runs before `updated`:
   * settled there, the two would be up together for a frame. The bookkeeping
   * is `HandOver`'s.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (!changed.has('open')) {
      return
    }
    if (this.open) {
      this.from = HelixHeadlessMegamenu.bar.open(this)?.size
      return
    }
    HelixHeadlessMegamenu.bar.close(this)
  }

  /** The panel's size the last time it was open, in pixels. */
  private size: { block: number; inline: number } | undefined

  /** The size of the panel this one took over from, if it took over. */
  private from: { block: number; inline: number } | undefined

  /**
   * Writes the panel's size onto its surface, and the size of the panel it
   * took over from, for a stylesheet that grows one into the next.
   */
  private measure(): void {
    const surface = this.partNamed('surface')
    if (!surface) {
      return
    }
    /* Measured with no size to grow from, so a sheet animating from the last
       one has not already moved the box being measured. */
    surface.style.removeProperty('--megamenu-from-inline-size')
    surface.style.removeProperty('--megamenu-from-block-size')
    const box = surface.getBoundingClientRect()
    this.size = { block: Math.round(box.height), inline: Math.round(box.width) }
    surface.style.setProperty('--megamenu-surface-inline-size', `${this.size.inline}px`)
    surface.style.setProperty('--megamenu-surface-block-size', `${this.size.block}px`)
    if (this.from) {
      surface.style.setProperty('--megamenu-from-inline-size', `${this.from.inline}px`)
      surface.style.setProperty('--megamenu-from-block-size', `${this.from.block}px`)
    }
  }

  /**
   * Says which way the reader moved when one panel took over from another.
   * Nothing clears all four, for a panel opened or closed on its own.
   */
  private motion(to: Motion | undefined): void {
    this.toggleState('from-end', to === 'from-end')
    this.toggleState('from-start', to === 'from-start')
    this.toggleState('to-end', to === 'to-end')
    this.toggleState('to-start', to === 'to-start')
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('bandBelow')) {
      this.watchWidth()
    }
    /* The one thing the stylesheet cannot work out for itself, since the
       breakpoint is declared up here. In `ElementInternals.states` rather than
       an attribute, for the reason `band-below` records: this is true on the
       first update on a phone, and the mirror would be a hydration mismatch. */
    this.toggleState('narrow', this.narrow)
    /* A slotted trigger is told the disclosure state, by property.

       `render` writes `aria-expanded` onto the button it renders itself, and a
       consumer who takes the documented `trigger` slot replaces that button, so
       without this the panel opens and closes and nothing announces it. Silent,
       because the slot works in every other respect and the failure is only
       audible.

       **Never `setAttribute` here: that is a hydration mismatch.** Measured
       against React 19.2.8, four families server-rendered and hydrated with the
       definitions loaded either side of `hydrateRoot`: this one and `SpeedDial`
       produced "some attributes of the server rendered HTML didn't match the
       client properties. This won't be patched up" in both orders, and
       `Popover` and `Menu`, which write nothing, were clean in both. React
       answers a mismatch by discarding the server's HTML for that subtree and
       rebuilding it, which is the expensive half rather than the console line.

       **The property is the way through**, as `Menu` already does for its items.
       React diffs the attributes it rendered and never looks at a property, so
       `expanded` travels to the trigger, lands as `aria-expanded` inside that
       element's shadow root, and the consumer's markup is left as they served
       it.

       **What it cannot reach is a trigger that is not a Helix element.** A plain
       `<button slot="trigger">` has no shadow root to hide the state in and no
       property to take it, and a React consumer cannot mirror it themselves
       because the open state is this element's. That case is warned about rather
       than written to, on the same argument `Tooltip` makes about a link it
       will not write for the consumer.

       **`aria-controls` is not written here and cannot be.** It would name
       `panel`, an id inside this shadow root, and an IDREF resolves only within
       the tree that holds it: from a light-DOM trigger looking in, the reference
       is to nothing. Measured, `document.querySelector('#panel')` came back
       `null` while the same id resolved inside `megamenu.shadowRoot`. An inert
       `aria-controls` is worse than none, an audit tool reporting it satisfied
       and a screen reader following it nowhere. */
    this.tellTrigger()
    if (this.open) {
      this.band()
      this.measure()
    }
  }

  /**
   * The control that opens it, behind a seam the styled tier can move.
   *
   * The same case `SpeedDial` records: a bare `<button>` is what this tier can
   * write, `Button` lives a tier above, and a render method is how a tier that
   * has one reaches this without reimplementing the panel below it.
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

  /**
   * The mark under the trigger, while the panel is open. Rendered only then,
   * so a mark of your own needs no rule to hide it while the panel is closed,
   * and hidden from the accessibility tree: the trigger's `aria-expanded`
   * already says the panel is open.
   */
  protected renderIndicator(): TemplateResult | typeof nothing {
    return this.open
      ? html`<slot name="indicator" part="indicator" aria-hidden="true"></slot>`
      : nothing
  }

  protected override render(): TemplateResult {
    /* The listeners sit on the host rather than the trigger, so the panel counts
       as inside it: the top layer changes where the panel is painted and not
       where it is in the tree, so a pointer moving off the trigger and onto the
       panel has not left this element and fires no leave. */
    return html`${this.renderTrigger()}${this.renderIndicator()}
      <div
        part="surface"
        id="panel"
        popover="manual"
        aria-label=${this.label || nothing}
        role="group"
        ?hidden=${!this.open}
      >
        <slot part="columns"></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-megamenu': HelixHeadlessMegamenu
  }
}
