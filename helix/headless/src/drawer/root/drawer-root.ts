import {
  AriaForwardController,
  CommandController,
  customElement,
  drawDismiss,
  drawDismissGlyph,
  edgeOffset,
  FocusScopeController,
  HelixElement,
  headingsIn,
  isRtl,
  lockScroll,
  MixinControllerOpen,
  nearest,
  OpenPhaseController,
  onUnlessFalse,
  parseSnapPoints,
  reflectElements,
  SwipeController,
  type SwipeEdge,
  settleSwipe,
  snapTravel,
  swipeAxis,
  swipeEdge,
  towardEdge,
  unlockScroll,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { beyondWindow } from '../reveal.js'
import { startsSwipe } from '../swipe-start.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * Uses `MixinControllerOpen`, so `open`, `defaultOpen`, and the
 * `helix-before-open` and `helix-before-close` events work the same way as on
 * an accordion item.
 *
 * The drawer is modal by default, which means four things:
 *
 * - focus is trapped inside: `Tab` from the last control goes to the first,
 *   and `Shift+Tab` from the first to the last, as in `Dialog`
 * - Escape and a press outside close it
 * - the page behind is covered
 * - the page behind does not scroll
 *
 * A drawer with `modal="false"` leaves the page usable and still closes on
 * Escape, in a browser without `closedby` as well.
 *
 * **A touch or a pen swipes it away**, toward the edge it came from, resolved
 * against the writing direction. A swipe past halfway, or a quick one, closes
 * it through the same request as every other way out. `snap-points` lists the
 * fractions of the panel a reader can leave on screen, such as `0.5 1` for a
 * sheet that rests half open: it opens at the smallest, and a swipe settles at
 * the nearest. While a swipe moves the panel, the distance is written on it as
 * `--drawer-swipe-x` and `--drawer-swipe-y`. `swipe="false"` turns swiping off.
 *
 * `snap` is the snap point the panel rests at, and `:state(snapped)` is on the
 * host while that is less than the whole panel. `snapTo()` moves it to
 * another. **Focus moving to a control past the
 * window's edge opens the panel to its largest snap point**, so a reader
 * moving through a half open sheet with `Tab` never lands on a control they
 * cannot see.
 *
 * Set `dismissible` to draw a close control in the corner, labeled by
 * `dismiss-label`, as `Dialog` draws one.
 *
 * The panel's name is `label` when you set it. Otherwise it is the heading in
 * the `header` slot, or the elements an `aria-labelledby` on the host names.
 *
 * Content stays mounted when the drawer is closed, so it is in the server
 * markup and can animate. A closed `<dialog>` is already out of the tab order
 * and the accessibility tree, so the drawer does not write `inert`. The `role`,
 * `aria-modal`, and the scrim also come from the `<dialog>` element.
 * `drawer-root.ssr.spec.ts` checks that the panel has no hand-written `inert`
 * or `role`.
 *
 * Open the drawer declaratively with the platform's invoker attributes:
 *
 * ```html
 * <helix-headless-button commandfor="nav" command="--toggle">Menu</helix-headless-button>
 * <helix-headless-drawer id="nav">…</helix-headless-drawer>
 * ```
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Sheet, Sidebar, Panel, Off-canvas
 * @documentation https://fusion.dev/helix/components/drawer
 *
 * @slot - The drawer's content.
 * @slot dismiss-icon - Replaces the glyph inside the close control.
 * @slot footer - Content pinned below the scrolling area, such as the drawer's actions.
 * @slot header - Content pinned above the scrolling area.
 *
 * @event {Event} close - Sent from the host after the drawer closes, because the native `close` event does not leave the shadow root.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the panel closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the panel opens, and cancelable. Canceling it keeps the panel closed.
 * @event {ToggleEvent} toggle - Sent when the drawer opens or closes, with `newState` and `oldState`.
 *
 * @csspart content - The scrolling content region.
 * @csspart dismiss - The close control, drawn when the drawer is `dismissible`.
 * @csspart dismiss-mark - The glyph on the close control, where none is slotted.
 * @csspart footer - The footer region.
 * @csspart header - The header region.
 * @csspart panel - The sliding panel.
 *
 * @cssproperty --drawer-swipe-x - How far a swipe, or a snap point, has moved the panel across, in pixels, toward the right.
 * @cssproperty --drawer-swipe-y - How far a swipe, or a snap point, has moved the panel down, in pixels.
 *
 * @cssstate entering - From the moment the drawer opens until its entrance has finished.
 * @cssstate exiting - From the moment the drawer closes until its exit has finished.
 * @cssstate open - While the drawer is open.
 * @cssstate snapped - While the panel rests at a snap point that shows less than the whole panel.
 */
@customElement('helix-headless-drawer')
export class HelixHeadlessDrawer extends MixinControllerOpen(HelixElement) {
  /* Opened and closed from anywhere on the page, without a line of script:
     `<helix-headless-button commandfor="…" command="--show">`. The same three commands
     the dialog answers, because they are the same act: a drawer and a dialog
     differ in where they sit, not in what opening one means. */
  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.requestOpen(false),
      '--show': () => this.requestOpen(true),
      '--toggle': () => this.toggleOpen(),
    },
  })

  /**
   * Which close requests the browser handles on its own.
   *
   * `<dialog closedby>`, forwarded, and safe to forward because every path it
   * opens still comes back through this element: a close request fires `cancel`
   * first, `handleCancel` prevents it, and `requestOpen` decides. So
   * `closedby="any"` gains light dismiss without giving up the refusal, which is
   * the property this component exists to keep.
   *
   * Absent by default, which is the platform's `auto` and this library's rule
   * that a resting value is an attribute's absence.
   */
  @property({ attribute: 'closedby', reflect: true })
  closedBy?: 'any' | 'closerequest' | 'none'

  /**
   * Draws a control that closes the drawer, in the corner where the title is.
   *
   * Pressing it is `close()`, so it sends `helix-before-close` like every other
   * way out.
   */
  @property({ reflect: true, type: Boolean })
  dismissible = false

  /**
   * The close control's accessible name. Translate it with the rest of your
   * interface.
   */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Close'

  /**
   * Accessible name for the panel. When it is empty, the heading in the
   * `header` slot names the panel.
   */
  @property()
  label = ''

  /* `aria-labelledby` and `aria-describedby` written on the host, carried to
     the `<dialog>` that is the node a reader is on. */
  protected readonly aria = new AriaForwardController(this, { target: () => this.panel })

  /**
   * Whether the drawer blocks the page behind it.
   *
   * Turning this off removes the focus trap and the scrim together, because
   * they are one decision: a panel that traps focus without covering the page
   * strands the reader, and one that covers without trapping lets them tab
   * behind the cover.
   *
   * Not reflected. It stays `true` by default, since a drawer that silently
   * lost its focus trap because a consumer forgot a word would be worse than an
   * attribute on the host, and nothing selects on it: the scrim is rendered or
   * not, rather than shown or hidden by CSS.
   */
  @property({ converter: onUnlessFalse })
  modal = true

  /**
   * Which edge the drawer comes from.
   *
   * Unset is `end`, and it stays unset rather than being written down: a
   * default assigned to the property would reflect onto every host and put a
   * `placement="end"` into markup no consumer wrote. So what this tier
   * guarantees is the absence, and a sheet selects on it.
   */
  @property({ reflect: true })
  placement?: 'start' | 'end' | 'top' | 'bottom'

  /**
   * The fractions of the panel a reader can leave on screen, as a list such as
   * `0.5 1`. The drawer opens at the smallest, and a swipe comes to rest at the
   * nearest, or closes the drawer below the smallest.
   *
   * Empty is `1`: the whole panel, and a swipe either closes it or puts it
   * back.
   */
  @property({ attribute: 'snap-points' })
  snapPoints = ''

  /**
   * Whether a touch or a pen can swipe the drawer away. `swipe="false"` turns
   * it off, for a panel whose content has its own use for the gesture, such as
   * a map.
   */
  @property({ converter: onUnlessFalse })
  swipe = true

  /**
   * What the dialog closed with, the way `<dialog>` reports it.
   *
   * **The whole point of a `<dialog>` returning a value is lost behind a shadow
   * boundary**, which is where this one is: `querySelector` does not reach the
   * element, so a consumer could neither set the value nor read it back. A
   * drawer asking which of its actions dismissed it is the ordinary case and had
   * no answer.
   *
   * Written before `open` is set to false rather than passed to a `close(value)`
   * call, because this component has no such method: it is driven by `open`
   * alone, and `Dialog`'s `close()` is the one that takes the value directly.
   *
   * Held here as well as on the element, so a value set before the first render
   * survives to it and a consumer reading one back gets what they wrote.
   */
  get returnValue(): string {
    return this.panel?.returnValue ?? this.returned
  }

  set returnValue(value: string) {
    this.returned = value
    const panel = this.panel
    if (panel) {
      panel.returnValue = value
    }
  }

  /** What a value set before the element existed is kept in. */
  private returned = ''

  /* `:state(entering)` and `:state(exiting)`, as `Dialog` records them. */
  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.panel,
  })

  /** How far the panel rests toward its edge, in pixels, at the snap point it settled on. */
  private rest = 0

  /** The fraction of the panel on screen at the snap point it rests at. */
  private shown = 1

  /** The edge the panel leaves through, from its placement and the writing direction. */
  private get edge(): SwipeEdge {
    return swipeEdge(this.placement ?? 'end', isRtl(this))
  }

  /** The panel's size along the swipe, in pixels. */
  private get extent(): number {
    const box = this.panel?.getBoundingClientRect()
    return (swipeAxis(this.edge) === 'x' ? box?.width : box?.height) ?? 0
  }

  /* Swipe to dismiss. The controller says where the pointer is; what it means
     here, a snap point or a close, is settled by `settleSwipe`. */
  protected readonly swipes = new SwipeController(this, {
    axis: () => (this.open && this.swipe ? swipeAxis(this.edge) : undefined),
    end: (dx, dy, vx, vy) => this.settle(dx, dy, vx, vy),
    move: (dx, dy) => this.place(Math.max(0, this.rest + towardEdge(this.edge, dx, dy))),
    start: (target, event) =>
      startsSwipe(target, event.pointerType, swipeAxis(this.edge), this.partNamed('content')),
    surface: () => this.panel,
  })

  /**
   * Writes how far the panel sits toward its edge, as the two properties the
   * styled tier translates it by. Nothing is written at rest.
   */
  private place(travel: number): void {
    const panel = this.panel
    if (!panel) {
      return
    }
    const { x, y } = edgeOffset(this.edge, travel)
    const px = (value: number): string => (value === 0 ? '' : `${Math.round(value)}px`)
    /* An empty value takes the property off, so nothing is written at rest. */
    panel.style.setProperty('--drawer-swipe-x', px(x))
    panel.style.setProperty('--drawer-swipe-y', px(y))
  }

  /** Brings a released swipe to rest: at a snap point, or closed through the request. */
  private settle(dx: number, dy: number, vx: number, vy: number): void {
    const edge = this.edge
    const size = this.extent
    const shown = settleSwipe({
      points: parseSnapPoints(this.snapPoints),
      size,
      travel: Math.max(0, this.rest + towardEdge(edge, dx, dy)),
      velocity: towardEdge(edge, vx, vy),
    })
    if (shown === 0 && this.requestOpen(false)) {
      return
    }
    if (shown !== 0) {
      this.restAt(shown)
    } else {
      this.place(this.rest)
    }
  }

  /**
   * The fraction of the panel on screen at the snap point it rests at, such as
   * `0.5`. It is `1`, the whole panel, while the drawer is closed or has no
   * `snap-points`.
   */
  get snap(): number {
    return this.open ? this.shown : 1
  }

  /**
   * Puts the panel at rest at a snap point, and says on the host, as
   * `:state(snapped)`, while that is short of the whole panel.
   */
  private restAt(shown: number): void {
    this.shown = shown
    this.rest = snapTravel(this.extent, shown)
    this.place(this.rest)
    this.markSnap()
  }

  /** Says whether the panel rests short of the whole, and nothing while closed. */
  private markSnap(): void {
    this.toggleState('snapped', this.open && this.shown < 1)
  }

  /**
   * Moves the open panel to rest at the snap point nearest `point`, a fraction
   * of the panel such as `1` for the whole of it.
   */
  snapTo(point: number): void {
    if (!this.open) {
      return
    }
    const points = parseSnapPoints(this.snapPoints)
    const at = nearest(points, point)
    if (at !== undefined) {
      this.restAt(at)
    }
  }

  /**
   * Focus moving to a control past the window's edge, in a panel resting short
   * of the whole: the panel opens to its largest snap point, so the control is
   * on screen.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const target = event.composedPath()[0]
    if (this.shown >= 1 || !(target instanceof Element) || typeof window === 'undefined') {
      return
    }
    if (beyondWindow(target.getBoundingClientRect(), window.innerWidth, window.innerHeight)) {
      this.snapTo(1)
    }
  }

  /** Opens the drawer. */
  show(): void {
    this.requestOpen(true)
  }

  /**
   * Requests that the drawer close, and takes what it closed with, the way
   * `Dialog.close(value)` does. A `helix-before-close` listener can refuse it,
   * and then the value is not kept.
   */
  close(returnValue?: string): void {
    const previous = this.returnValue
    if (returnValue !== undefined) {
      this.returnValue = returnValue
    }
    if (!this.requestOpen(false) && returnValue !== undefined) {
      this.returnValue = previous
    }
  }

  /**
   * Escape on a drawer that is not modal, in a browser without `closedby`.
   *
   * `show()` gives a `<dialog>` no close watcher, and `closedby="closerequest"`
   * is what asks for one. Where the browser does not know the attribute, the
   * key is read here, and comes through the same request.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Escape' ||
      event.defaultPrevented ||
      this.modal ||
      !this.open ||
      closedByKnown()
    ) {
      return
    }
    event.preventDefault()
    this.requestOpen(false)
  }

  /* `Tab` from the last control goes to the first, and `Shift+Tab` from the
     first to the last, while a modal drawer is open. A native modal lets `Tab`
     past its last control out to the browser's own controls, which takes a
     keyboard reader out of the page; `Dialog` wraps the same way. */
  protected readonly scope = new FocusScopeController(this, {
    contain: () => this.open && this.modal,
    contents: () => [
      ...['header', '', 'footer'].flatMap(
        (name) =>
          this.renderRoot
            ?.querySelector<HTMLSlotElement>(name ? `slot[name="${name}"]` : 'slot:not([name])')
            ?.assignedElements({ flatten: true }) ?? [],
      ),
      /* And the close control the drawer draws itself, the one control the
         panel holds besides its slots. */
      ...[...(this.panel?.children ?? [])].filter((one) => one.localName === 'button'),
    ],
    surface: () => this.panel,
  })

  /** The panel, which is a real `<dialog>`. */
  private get panel(): HTMLDialogElement | null {
    return this.partNamed<HTMLDialogElement>('panel')
  }

  /**
   * Escape, routed through the request so a listener can refuse it.
   *
   * A native dialog closes itself on Escape, which would shut the drawer while
   * the consumer's state still said open: the bug that makes a modal impossible
   * to reopen. `Dialog` intercepts it for the same reason.
   */
  private readonly handleCancel = (event: Event): void => {
    event.preventDefault()
    this.requestOpen(false)
  }

  /** A close that happened anyway is reflected back rather than argued with. */
  private readonly handleClose = (event: Event): void => {
    if (this.open) {
      this.requestOpen(false)
    }
    /* And under the platform's own name, from the host. `close` on a `<dialog>`
       neither bubbles nor is composed, so the one the browser just fired reaches
       nobody outside this shadow root, which is the same reason `Avatar` relays
       `load`. Announced after the state has moved, so a consumer binding
       `onClose` reads a dialog that is already shut.

       `cancel` is deliberately not relayed. `handleCancel` prevents it so that
       Escape is a request rather than an act, so the native one never completes:
       relaying it would announce a dismissal that was refused. */
    this.relayNativeEvent(event)
  }

  /**
   * A press on the backdrop, which lands on the dialog element itself.
   *
   * A native `<dialog>` does not close on that, and it is the gesture that most
   * obviously means close.
   *
   * **The target alone is not enough.** The panel is the `<dialog>`, and a
   * press in its own padding has the dialog as its target too, the same as a
   * press on the backdrop. So the point is compared against the panel's box,
   * as `Dialog` does.
   */
  private readonly handleBackdrop = (event: MouseEvent): void => {
    const panel = this.panel
    if (!panel || event.target !== panel || !this.modal) {
      return
    }
    const box = panel.getBoundingClientRect()
    if (
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom
    ) {
      return
    }
    this.requestOpen(false)
  }

  /** Whether the `header` slot's heading is what currently names the panel. */
  private namedByHeader = false

  /**
   * Names the panel by its heading, where nothing else names it.
   *
   * An element reference, because the heading is in the light DOM and the
   * `<dialog>` is in this shadow root, which an IDREF cannot cross. `label` and
   * an `aria-labelledby` on the host come first. A browser without element
   * reflection keeps the fallback name.
   */
  private nameByHeader(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="header"]')
    const heading =
      this.label || this.hasAttribute('aria-labelledby')
        ? []
        : headingsIn(slot?.assignedElements({ flatten: true }) ?? [])
    this.namedByHeader = reflectElements(
      this.panel,
      'ariaLabelledByElements',
      heading,
      this.namedByHeader,
    )
  }

  /* On the host, which hears focus moving to slotted content and to the
     panel's own controls alike. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.handleFocusIn)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.handleFocusIn)
    unlockScroll(this)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.nameByHeader()
    if (changed.has('open') && !this.open) {
      this.rest = 0
      this.shown = 1
      this.place(0)
      this.markSnap()
    }
    if (this.open && this.modal) {
      lockScroll(this)
    } else {
      unlockScroll(this)
    }
    /* After render, and only on a difference: `showModal()` on an open dialog
       throws and `close()` on a shut one fires a second `close` event.
     *
     * `showModal` when modal and `show` when not, which is the whole of what
     * `modal` means: both put the panel in the top layer, and only the first
     * brings a backdrop, a focus trap and `inert` behind it. */
    const panel = this.panel
    if (!panel) {
      return
    }
    if (this.open && !panel.open) {
      if (this.modal) {
        panel.showModal()
      } else {
        panel.show()
      }
      /* At the smallest snap point, once the panel has a size to measure. */
      this.restAt(parseSnapPoints(this.snapPoints)[0] ?? 1)
    } else if (!this.open && panel.open) {
      panel.close()
    }
  }

  protected override render(): TemplateResult {
    /* No `role`, no `aria-modal`, no `inert`, no `tabindex`: a `<dialog>` opened
       with `showModal()` carries all four, and each hand-written version was a
       thing that could drift from what the element actually did. */
    /* **A non-modal panel asks for Escape.** `show()` gives a `<dialog>` no
       close watcher unless `closedby` says so, and a drawer that ignores Escape
       has no keyboard way out. `closerequest` is what `showModal()` gets by
       default, and its `cancel` comes back through `handleCancel` like the
       modal one's. */
    const closedBy = this.closedBy ?? (this.modal ? undefined : 'closerequest')
    return html`<dialog
      part="panel"
      closedby=${closedBy ?? nothing}
      aria-label=${this.label || 'Drawer'}
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
      @keydown=${this.handleKeydown}
    >
      <div part="header"><slot name="header" @slotchange=${this.nameByHeader}></slot></div>
      <div part="content"><slot></slot></div>
      <div part="footer"><slot name="footer"></slot></div>
      ${
        this.dismissible
          ? drawDismiss({
              label: this.dismissLabel,
              mark: this.renderDismissIcon(),
              onDismiss: () => this.close(),
            })
          : nothing
      }
    </dialog>`
  }

  /**
   * The glyph on the close control, behind a seam: slot fallback, so a
   * consumer replaces it by slotting, and a method, so a tier above replaces it
   * by overriding. As `Dialog` draws it.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="dismiss-icon">
      ${drawDismissGlyph()}
    </slot>`
  }
}

/** Whether the browser knows `<dialog closedby>`, which a non-modal drawer's Escape rests on. */
const closedByKnown = (): boolean =>
  typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-drawer': HelixHeadlessDrawer
  }
}
