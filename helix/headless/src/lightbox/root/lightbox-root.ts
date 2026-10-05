import {
  CommandController,
  customElement,
  deepActiveElement,
  deepContains,
  drawDismiss,
  drawDismissGlyph,
  FullscreenController,
  fillTemplate,
  HelixElement,
  hostAria,
  IdleController,
  inlineStep,
  isRtl,
  keyClaimed,
  lockScroll,
  MixinControllerActive,
  MixinControllerOpen,
  resolveActiveItem,
  SwipeController,
  swipeStep,
  unlockScroll,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessLightboxItem } from '../item/lightbox-item.js'
import type { Offset } from '../zoom.js'
import { ZoomController } from '../zoom-controller.js'

/**
 * @summary A viewer that shows one item at a time over the page.
 *
 * @description
 * The frame around content you open, such as a picture, a video frame, or a
 * chart. The lightbox draws no content of its own. It provides the frame, the
 * keyboard behavior, and text that states the current position in the set.
 *
 * The modal behavior comes from a native `<dialog>` opened with `showModal()`,
 * which provides the top layer, a backdrop, Escape to close, and `inert` on the
 * rest of the document. Every way of closing goes through `requestOpen`, as in
 * `Dialog` and `Drawer`.
 *
 * A lightbox shows one item at a time and has no scrolling track, so `active`
 * holds the current item, as in `Tabs`. The arrow keys change the item while
 * focus stays in the dialog.
 *
 * Set `controls` for the viewer's own previous, next and close controls, named
 * by `previous-label`, `next-label` and `dismiss-label`, whose glyphs you can
 * replace in the `previous-icon`, `next-icon` and `dismiss-icon` slots. Without
 * it, compose the chrome yourself in the `header` and `footer` slots, with
 * buttons that send `--previous`, `--next` and `--close`.
 *
 * **Set `max-zoom` to let a reader zoom into the shown item**, such as `3`.
 * Two fingers pinch it, a double click or a double tap zooms all the way in
 * about the point pressed and back out, and once zoomed one pointer drags it
 * about. `+` and `-` zoom in and out from the keyboard, and `0` puts it back.
 * The scale and the offset are on the `viewport` part as `--lightbox-zoom`,
 * `--lightbox-pan-x` and `--lightbox-pan-y`, written only while zoomed, and a
 * swipe moves to the next item only while the item is at its own size.
 *
 * Each item is a slide: a `group` with the role description in
 * `slide-role-label`, named by its `label` or by `slide-label`. A touch or a pen
 * swiped across the picture shows the next or the previous item, the way the
 * line of text runs.
 *
 * The chrome hides when there is no input, through `IdleController`, and comes
 * back on a pointer move, a key press, or a focus. It stays while focus is on a
 * control in the header or the footer, so a keyboard reader is never left on
 * a control that has gone. `fullscreen` uses `FullscreenController`, as `Video`
 * does. While the viewer is open, the page behind it does not scroll.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Photo viewer, Image viewer, Gallery overlay
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @slot - The items, which are `<helix-headless-lightbox-item>` elements.
 * @slot dismiss-icon - Replaces the glyph inside the close control.
 * @slot footer - Content below the item, such as a counter or a thumbnail strip.
 * @slot header - Content above the item, such as a title and a close button.
 * @slot next-icon - Replaces the glyph inside the next control.
 * @slot previous-icon - Replaces the glyph inside the previous control.
 *
 * @event {Event} close - Fired when the viewer closes. The component dispatches it again from the host, because the dialog's own event does not leave the shadow root.
 * @event {HelixActivateEvent} helix-activate - Fired after the shown item changes, when the element already holds the new item.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the shown item changes. Cancelable: cancel it to keep the current item. It is the only way to stop the change.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the viewer closes. Cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the viewer opens. Cancelable.
 * @event {ToggleEvent} toggle - Fired when the viewer opens or closes, with `newState` and `oldState`.
 *
 * @csspart dialog - The native dialog element.
 * @csspart dismiss - The close control, drawn with `controls`.
 * @csspart dismiss-mark - The glyph on the close control, where none is slotted.
 * @csspart live - The live region that announces which item is shown.
 * @csspart next - The control that shows the next item, drawn with `controls`.
 * @csspart next-mark - The glyph on the next control, where none is slotted.
 * @csspart previous - The control that shows the previous item, drawn with `controls`.
 * @csspart previous-mark - The glyph on the previous control, where none is slotted.
 * @csspart viewport - The box the current item is shown in.
 *
 * @cssproperty --lightbox-pan-x - How far the zoomed item is moved across from the middle of the viewport, in pixels, toward the right. Written only while zoomed.
 * @cssproperty --lightbox-pan-y - How far the zoomed item is moved down from the middle of the viewport, in pixels. Written only while zoomed.
 * @cssproperty --lightbox-zoom - The scale the shown item is zoomed to, such as `2`. Written only while zoomed.
 *
 * @cssstate fullscreen - While the viewer fills the screen.
 * @cssstate idle - The user has been still long enough for the controls to hide.
 * @cssstate open - While the viewer is open.
 * @cssstate zoomable - While `max-zoom` lets a reader zoom.
 * @cssstate zoomed - While the shown item is zoomed past its own size.
 */
@customElement('helix-headless-lightbox')
export class HelixHeadlessLightbox extends MixinControllerActive(
  MixinControllerOpen(HelixElement),
) {
  /**
   * Draws the viewer's own previous, next and close controls over the picture.
   *
   * Off by default, for a viewer whose chrome you compose in the `header` and
   * `footer` slots. The controls hide with the rest of the chrome while the
   * reader is idle, and the previous and next ones say they are unavailable at
   * either end of a set that does not `loop`.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * The close control's accessible name. Translate it with the rest of your
   * interface.
   */
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Close'

  /**
   * How long the user can be idle before the header and footer hide, in
   * milliseconds.
   *
   * Zero keeps it up, which is what a viewer with a caption worth reading
   * wants. The wait is only ever about idling: whether anything else should
   * keep the chrome up is the consumer's to decide with this.
   */
  @property({ attribute: 'idle-delay', type: Number })
  idleDelay = 0

  /**
   * The viewer's name, read by screen readers.
   */
  @property()
  label = ''

  /**
   * Whether moving past the last item returns to the first.
   */
  @property({ reflect: true, type: Boolean })
  loop = false

  /**
   * How far a reader can zoom into the shown item, as a scale, such as `3`.
   * `1`, the default, turns zooming off.
   */
  @property({ attribute: 'max-zoom', type: Number })
  maxZoom = 1

  /**
   * The next control's accessible name.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next'

  /**
   * The previous control's accessible name.
   */
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous'

  /**
   * The name of an item with no `label` of its own, with `{index}` and
   * `{count}` filled in.
   */
  @property({ attribute: 'slide-label' })
  slideLabel = '{index} of {count}'

  /**
   * The word screen readers announce in place of an item's role, set as
   * `aria-roledescription`. Translate it with the rest of your text, or empty
   * it to leave the role as `group`.
   */
  @property({ attribute: 'slide-role-label' })
  slideRoleLabel = 'slide'

  /**
   * The status text that says which item is shown, with `{index}`, `{count}`
   * and the item's `{label}` filled in.
   *
   * Announced rather than only drawn, because the picture changing under a
   * reader who cannot see it is otherwise silent. A consumer who has their own
   * counter in the chrome can empty this and say it themselves.
   */
  @property({ attribute: 'status-label' })
  statusLabel = '{index} of {count}'

  /** Whether the reader has been still long enough to hide the chrome. */
  @state()
  private resting = false

  /** Whether the viewer is filling the screen. */
  @state()
  private filled = false

  /** What the live region is currently saying. */
  @state()
  private announcement = ''

  /* A swipe across the viewer, read by `swipeStep` as next or previous. The
     whole viewer, since the picture may be far smaller than the screen. */
  protected readonly swipes = new SwipeController(this, {
    axis: () => (this.open && !this.zoomer.engaged ? 'x' : undefined),
    end: (dx, _dy, vx) => {
      /* Two fingers came down while it was under way: a pinch, not a swipe. */
      if (this.zoomer.pinched) {
        return
      }
      const width = this.partNamed('viewport')?.getBoundingClientRect().width ?? 0
      const step = swipeStep(dx, vx, width, isRtl(this))
      if (step !== 0) {
        this.step(step)
      }
    },
    move: () => this.idle.stir(),
    start: (_target, event) => event.pointerType !== 'mouse',
    surface: () => this.dialog,
  })

  /* Pinch, double press and drag, about the viewport. */
  private readonly zoomer = new ZoomController(this, {
    max: () => (this.open ? this.maxZoom : 1),
    onChange: (scale, pan) => this.drawZoom(scale, pan),
    surface: () => this.partNamed('viewport'),
  })

  /** Writes the zoom on the viewport, and nothing at the item's own size. */
  private drawZoom(scale: number, pan: Offset): void {
    const viewport = this.partNamed('viewport')
    const zoomed = scale > 1
    viewport?.style.setProperty('--lightbox-zoom', zoomed ? String(scale) : '')
    viewport?.style.setProperty('--lightbox-pan-x', zoomed ? `${Math.round(pan.x)}px` : '')
    viewport?.style.setProperty('--lightbox-pan-y', zoomed ? `${Math.round(pan.y)}px` : '')
    this.toggleState('zoomed', zoomed)
    this.idle.stir()
  }

  /**
   * Zooms the shown item to `scale`, held between `1` and `max-zoom`, about
   * the middle of the viewport.
   */
  zoomTo(scale: number): void {
    this.zoomer.zoomTo(scale)
  }

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.filled = full
  })

  private readonly idle = new IdleController(
    this,
    () => this.idleDelay,
    (resting) => {
      this.resting = resting && !this.chromeHasFocus()
    },
  )

  /**
   * Whether focus is on something in the header or the footer.
   *
   * The styled tier hides both with `visibility: hidden` while idle, which
   * takes focus off a control in them and drops it on the body, where the
   * arrow keys no longer reach this element.
   */
  private chromeHasFocus(): boolean {
    const active = deepActiveElement()
    const own = this.shadowRoot?.activeElement?.matches(
      '[part="previous"], [part="next"], [part="dismiss"]',
    )
    return (
      own === true ||
      this.knownChildren.some(
        (child) =>
          (child.slot === 'header' || child.slot === 'footer') && deepContains(child, active),
      )
    )
  }

  /* Opened, walked and closed from anywhere on the page without a line of
     script, which is what a lightbox's chrome is made of: a close button and
     two arrows that are all `<helix-button commandfor>` and nothing else. */
  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.close(),
      '--fullscreen': () => this.toggleFullscreen(),
      '--next': () => this.next(),
      '--previous': () => this.previous(),
      '--show': () => this.show(),
      '--toggle': () => this.toggleOpen(),
    },
  })

  /**
   * The items, read from the host.
   *
   * **`knownChildren` and not `children`**, which is undefined on the server:
   * spreading it threw the first time a lightbox was rendered there open,
   * which is the first time anything asked it for its items on a server.
   */
  private get items(): HelixHeadlessLightboxItem[] {
    return this.knownChildren.filter(
      (child): child is HelixHeadlessLightboxItem => child instanceof HelixHeadlessLightboxItem,
    )
  }

  /** The native dialog, or nothing where there is no DOM to hold one. */
  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  /** Opens the viewer, which makes the rest of the page inert. */
  show(): void {
    this.requestOpen(true)
  }

  /** Closes the viewer, unless a `helix-before-close` listener cancels it. */
  close(): void {
    this.requestOpen(false)
  }

  /**
   * Shows the next item. After the last item, it shows the first when `loop`
   * is set.
   */
  next(): void {
    this.step(1)
  }

  /**
   * Shows the previous item. Before the first item, it shows the last when
   * `loop` is set.
   */
  previous(): void {
    this.step(-1)
  }

  /** Makes the viewer fill the screen, or exits fullscreen. */
  toggleFullscreen(): void {
    void this.fullscreen.toggle()
  }

  /**
   * Moves the shown item, through `requestActive` so a consumer can refuse.
   *
   * Clamped rather than wrapped by default: a viewer that silently returns to
   * the first picture tells a reader they have seen everything only if they
   * were counting, and `loop` is how a consumer asks for the other reading.
   */
  private step(by: number): void {
    const items = this.items
    if (items.length === 0) {
      return
    }
    /* From the picture on screen, which is the first where `active` names
       nothing, and compared against it too: against `active`, a step that
       went nowhere asked to show the picture already showing, and said so. */
    const shown = this.shown
    const current = shown ? items.indexOf(shown) : -1
    const from = current === -1 ? 0 : current
    const last = items.length - 1
    const next = this.loop
      ? (from + by + items.length) % items.length
      : Math.min(Math.max(from + by, 0), last)
    const target = items[next]
    if (target && target !== shown) {
      this.requestActive(target.value)
    }
  }

  /**
   * Escape, intercepted so it is a request rather than an act.
   *
   * The native `cancel` fires before the dialog closes, so preventing it leaves
   * the viewer open and lets `requestOpen` decide. Without this a reader
   * pressing Escape would close a viewer its consumer had said was open, and the
   * two would disagree until something else moved.
   */
  private readonly handleCancel = (event: Event): void => {
    event.preventDefault()
    this.requestOpen(false)
  }

  /**
   * A close that happened anyway, reflected back and relayed.
   *
   * `close` on a `<dialog>` neither bubbles nor is composed, so the one the
   * browser fires reaches nobody outside this shadow root.
   */
  private readonly handleClose = (event: Event): void => {
    if (this.open) {
      this.requestOpen(false)
    }
    this.relayNativeEvent(event)
  }

  /**
   * The arrow keys, which move the picture rather than the focus.
   *
   * `inlineStep` rather than a comparison against `ArrowLeft`, so the reader on
   * a right-to-left page gets the next picture from the key that points the way
   * their set runs. Up and down are bound as well, the set having one axis and
   * a reader having no way to know which one this component thinks it is.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* Any key is the reader being there, as a pointer move is. */
    this.idle.stir()
    /* Not a press the viewer's content answers, or one that is a chord. A
       caption field or a slider in the chrome keeps its own arrows, Home and
       End, and Alt with an arrow is the browser's back and forward. */
    if (keyClaimed(event) || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    if (this.zoomKey(event.key)) {
      event.preventDefault()
      return
    }
    const along = inlineStep(this, event.key)
    if (along === 1 || event.key === 'ArrowDown') {
      event.preventDefault()
      this.next()
    } else if (along === -1 || event.key === 'ArrowUp') {
      event.preventDefault()
      this.previous()
    } else if (event.key === 'Home') {
      event.preventDefault()
      this.toEnd(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      this.toEnd(this.items.length - 1)
    }
  }

  /** `+` and `-` zoom in and out by half again, and `0` puts the item back. Returns whether it was one. */
  private zoomKey(key: string): boolean {
    if (this.maxZoom <= 1) {
      return false
    }
    const scale = this.zoomer.scale
    if (key === '+' || key === '=') {
      this.zoomer.zoomTo(scale * 1.5)
    } else if (key === '-') {
      this.zoomer.zoomTo(scale / 1.5)
    } else if (key === '0') {
      this.zoomer.reset()
    } else {
      return false
    }
    return true
  }

  /** Home and End, which are an index rather than a step. */
  private toEnd(at: number): void {
    const target = this.items[at]
    if (target && target !== this.shown) {
      this.requestActive(target.value)
    }
  }

  /** The item on screen: the one `active` names, or the first where it names none. */
  private get shown() {
    return resolveActiveItem(this.active ?? '', this.items)
  }

  /**
   * A press on the backdrop, which lands on the dialog element itself.
   *
   * The point is compared against the panel's box rather than trusting the
   * target alone, for the reason `Dialog` gives: a modal `<dialog>` attributes
   * backdrop presses to itself, so any padding the styled tier gives the panel
   * is a strip where a press on the panel looks like a press outside it.
   */
  private readonly handleBackdrop = (event: MouseEvent): void => {
    const panel = this.dialog
    if (!panel || event.target !== panel) {
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

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
    this.toggleState('zoomable', this.maxZoom > 1)
    /* Every item starts at its own size, and a closed viewer keeps no zoom. */
    if (changed.has('active') || (changed.has('open') && !this.open)) {
      this.zoomer.reset()
    }
    /* Before render and not after, or the region renders one move behind: the
       reading is this element's own state, so computing it in `updated` puts it
       into the *next* render and announces the picture the reader has just left. */
    this.say(changed)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    unlockScroll(this)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.mark()
    if (this.open) {
      lockScroll(this)
    } else {
      unlockScroll(this)
    }

    /* After render and only on a difference: `showModal()` on an open dialog
       throws, and `close()` on a shut one fires a second `close` event. */
    const dialog = this.dialog
    if (!dialog) {
      return
    }
    if (this.open && !dialog.open) {
      dialog.showModal()
      /* Said as well as marked, because `autofocus` on a dialog was honored
         when the markup opened it and not when a framework set `open` after
         it rendered: the first control took focus instead, ringed. */
      dialog.focus({ preventScroll: true })
      /* The chrome starts up and the wait starts with it, or a viewer opened
         with `idle-delay` set shows nothing until the reader moves. */
      this.idle.stir()
    } else if (!this.open && dialog.open) {
      dialog.close()
    }
  }

  /**
   * Tells each item whether it is the one being shown.
   *
   * `resolveActiveItem` rather than a comparison, so a set whose `active` names
   * nothing still shows something: every set before its consumer has chosen, and
   * every set whose current item has just been removed.
   */
  private mark(): void {
    const items = this.items
    const current = resolveActiveItem(this.active, items)
    items.forEach((item, at) => {
      item.current = item === current
      /* Once the item has hydrated, so its first render is the server's. */
      whenHydrated(item, () => {
        item.position = fillTemplate(this.slideLabel, {
          count: items.length,
          index: at + 1,
          label: item.label,
        })
        item.roleLabel = this.slideRoleLabel
      })
    })
  }

  /** Whether a step that way would show nothing new, at the end of a set that does not loop. */
  private atEnd(by: -1 | 1): boolean {
    const items = this.items
    const shown = this.shown
    const at = shown ? items.indexOf(shown) : 0
    return !this.loop && (items.length === 0 || (by === 1 ? at >= items.length - 1 : at <= 0))
  }

  /**
   * Says where the reader is, once the reader has moved.
   *
   * Empty until then, because a live region populated as it enters the document
   * announces itself on arrival, which for a component that upgrades on load is
   * every page load.
   */
  private say(changed: PropertyValues): void {
    if (!changed.has('active') && !changed.has('open')) {
      return
    }
    if (!this.open || this.statusLabel === '') {
      this.announcement = ''
      return
    }
    const items = this.items
    const current = resolveActiveItem(this.active, items)
    const at = current ? items.indexOf(current) : -1
    this.announcement =
      at === -1 || !current
        ? ''
        : fillTemplate(this.statusLabel, {
            count: items.length,
            index: at + 1,
            label: current.label,
          })
  }

  protected override render(): TemplateResult {
    /* **Opening focuses the viewer itself** rather than whichever of the
       consumer's controls came first. A screen reader hears the viewer's name,
       the arrow keys walk the pictures at once, and the first control is not
       ringed as though somebody had tabbed to it; which one the browser
       picked, and whether it drew a ring, also differed with how the viewer
       was opened. Focusable with no tab stop of its own, so Tab goes on to the
       controls. */
    return html`<dialog
      part="dialog"
      aria-label=${this.label || 'Lightbox'}
      autofocus
      tabindex="-1"
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <slot name="header"></slot>
      <div part="viewport">
        <slot></slot>
      </div>
      <slot name="footer"></slot>
      ${this.controls ? this.renderControls() : nothing}
      <span part="live" role="status" aria-live="polite">${this.announcement || nothing}</span>
    </dialog>`
  }

  /**
   * The viewer's own controls, behind a seam a tier above can move.
   *
   * After the item in the order, so `Tab` from the viewer reaches the picture's
   * content first. `aria-disabled` at the ends, and never `disabled`, so a
   * control that has just shown the last picture keeps focus.
   */
  protected renderControls(): TemplateResult {
    return html`<button
        part="previous"
        type="button"
        aria-label=${this.previousLabel}
        aria-disabled=${this.atEnd(-1) ? 'true' : nothing}
        @click=${() => this.previous()}
      >
        <slot name="previous-icon">
          <svg part="previous-mark" data-mirror fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
            ${unsafeSVG(caretLeft.content)}
          </svg>
        </slot>
      </button>
      <button
        part="next"
        type="button"
        aria-label=${this.nextLabel}
        aria-disabled=${this.atEnd(1) ? 'true' : nothing}
        @click=${() => this.next()}
      >
        <slot name="next-icon">
          <svg part="next-mark" data-mirror fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
            ${unsafeSVG(caretRight.content)}
          </svg>
        </slot>
      </button>
      ${drawDismiss({
        label: this.dismissLabel,
        mark: html`<slot name="dismiss-icon">${drawDismissGlyph()}</slot>`,
        onDismiss: () => this.close(),
      })}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-lightbox': HelixHeadlessLightbox
  }
}
