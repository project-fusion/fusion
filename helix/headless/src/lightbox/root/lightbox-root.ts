import {
  CommandController,
  customElement,
  FullscreenController,
  fillTemplate,
  HelixElement,
  hostAria,
  IdleController,
  inlineStep,
  keyClaimed,
  MixinControllerActive,
  MixinControllerOpen,
  resolveActiveItem,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixHeadlessLightboxItem } from '../item/lightbox-item.js'

/**
 * @summary A viewer that opens one thing over the page.
 *
 * @description
 * **A lightbox is chrome around a picture rather than a picture.** It draws
 * nothing of its own: what it shows is whatever the consumer opened, so this
 * earns its place on the frame, the keyboard and the reading that says where in
 * the set the reader is.
 *
 * **The modal half is the platform's.** A real `<dialog>` opened with
 * `showModal()` brings the top layer, a backdrop, Escape and `inert` behind it,
 * and this repository has already removed one hand-written focus trap for being
 * worse than that: `inert` on the rest of the document is something no
 * JavaScript trap can achieve. Every way it can close comes back through
 * `requestOpen`, which is what `Dialog` and `Drawer` both do and for the reason
 * they both give.
 *
 * **The set is this component's own and not `Carousel`'s.** A carousel is a
 * track: a scroller with snap points, per-view arithmetic and stops it can rest
 * between. A lightbox shows one thing at a time and has no track, so what it
 * needs is which item is current, which is `active` and the same pair `Tabs`
 * uses. The arrow keys move the picture under a reader whose focus stays in the
 * dialog, which is also why `KeyboardNavigationController` is not the right
 * tool: that one moves focus between focusable items, and these are pictures.
 *
 * **Chrome hides while the reader is still**, on `IdleController`, and comes
 * back on a pointer move or a focus. `fullscreen` is `FullscreenController`, the
 * same pair `Video` holds and the only two it shares.
 *
 * @since 0.100.0
 * @status stable
 * @category media
 * @aliases Photo viewer, Image viewer, Gallery overlay
 * @documentation https://fusion.dev/helix/components/lightbox
 *
 * @slot - The items, which are `<helix-headless-lightbox-item>` elements.
 * @slot footer - Chrome below the item, such as a counter or a thumbnail strip.
 * @slot header - Chrome above the item, such as a title and a close button.
 *
 * @event {Event} close - Relayed, because the platform's own does not escape.
 * @event {HelixActivateEvent} helix-activate - Fired once the shown item has moved, so the element already holds it.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the shown item changes, and cancelable. The only way to refuse one.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart dialog - The native dialog element.
 * @csspart live - The region that says which item is shown.
 * @csspart viewport - The box the current item is shown in.
 *
 * @cssstate fullscreen - While the viewer fills the screen.
 * @cssstate idle - While the reader has been still long enough to hide the chrome.
 * @cssstate open - While the viewer is open.
 */
@customElement('helix-headless-lightbox')
export class HelixHeadlessLightbox extends MixinControllerActive(
  MixinControllerOpen(HelixElement),
) {
  /**
   * How long the reader may be still before the chrome hides, in milliseconds.
   *
   * Zero keeps it up, which is what a viewer with a caption worth reading
   * wants. The wait is only ever about idling: whether anything else should
   * keep the chrome up is the consumer's to decide with this.
   */
  @property({ attribute: 'idle-delay', type: Number })
  idleDelay = 0

  /**
   * Accessible name for the viewer.
   */
  @property()
  label = ''

  /**
   * Whether walking past the end comes back to the beginning.
   */
  @property({ reflect: true, type: Boolean })
  loop = false

  /**
   * The reading that says where in the set the reader is, with `{index}` and
   * `{count}` filled in.
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

  private readonly fullscreen = new FullscreenController(this, (full) => {
    this.filled = full
  })

  private readonly idle = new IdleController(
    this,
    () => this.idleDelay,
    (resting) => {
      this.resting = resting
    },
  )

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

  /** Asks to close, which a consumer may refuse. */
  close(): void {
    this.requestOpen(false)
  }

  /** Shows the next item, or the first where it is past the end and looping. */
  next(): void {
    this.step(1)
  }

  /** Shows the previous item, or the last where it is past the start and looping. */
  previous(): void {
    this.step(-1)
  }

  /** Fills the screen with the viewer, or comes back. */
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
    /* Not a press the viewer's content answers, or one that is a chord. A
       caption field or a slider in the chrome keeps its own arrows, Home and
       End, and Alt with an arrow is the browser's back and forward. */
    if (keyClaimed(event) || event.altKey || event.ctrlKey || event.metaKey) {
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
    /* Before render and not after, or the region renders one move behind: the
       reading is this element's own state, so computing it in `updated` puts it
       into the *next* render and announces the picture the reader has just left. */
    this.say(changed)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.mark()

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
    for (const item of items) {
      item.current = item === current
    }
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
      at === -1 ? '' : fillTemplate(this.statusLabel, { count: items.length, index: at + 1 })
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
      <span part="live" role="status" aria-live="polite">${this.announcement || nothing}</span>
    </dialog>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-lightbox': HelixHeadlessLightbox
  }
}
