import {
  auditName,
  CommandController,
  customElement,
  DelayController,
  deepActiveElement,
  deepContains,
  drawDismiss,
  drawDismissGlyph,
  FocusScopeController,
  FullscreenController,
  formatWords,
  HelixElement,
  hostAria,
  IdleController,
  inlineStep,
  isRtl,
  keyClaimed,
  lockScroll,
  MixinControllerActive,
  MixinControllerOpen,
  OpenPhaseController,
  resolveActiveItem,
  SwipeController,
  swipeStep,
  unlockScroll,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { caretLeft, caretRight, minus, plus } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessLightboxItem } from '../item/lightbox-item.js'
import { type Offset, percentOf } from '../zoom.js'
import { ZoomController } from '../zoom-controller.js'

/**
 * What names an item in `active`: its `value`, or its place in the set,
 * counted from 1, where it has none, as in `Steps`. A set written without
 * values still moves, and `active="2"` names its second item.
 */
const keyOf = (item: HelixHeadlessLightboxItem, index: number): string =>
  item.value || String(index + 1)

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
 * focus stays in the dialog. `active` names an item by its `value`, and an
 * item with no `value` by its place, counted from 1, as in `Steps`, so a set
 * written without values moves and `helix-activate` says `1`, `2` and so on.
 *
 * Set `controls` for the viewer's own previous, next and close controls, named
 * by `previous-label`, `next-label` and `dismiss-label`, whose glyphs you can
 * replace in the `previous-icon`, `next-icon` and `dismiss-icon` slots. Without
 * it, compose the chrome yourself in the `header` and `footer` slots, with
 * buttons that send `--previous`, `--next` and `--close`.
 *
 * **Set `max-zoom` to let a reader zoom into the shown item**, such as `3`.
 * Two fingers pinch it, and so does a trackpad pinch or the wheel with Ctrl
 * held, about the point under the pointer. A double click or a double tap
 * zooms all the way in about the point pressed and back out, and once zoomed
 * one pointer drags it about and the wheel moves it. `+` and `-` zoom in and out from the keyboard, and `0` puts it back.
 * The scale and the offset are on the `viewport` part as `--lightbox-zoom`,
 * `--lightbox-pan-x` and `--lightbox-pan-y`, written only while zoomed, and a
 * swipe moves to the next item only while the item is at its own size. With
 * `controls`, the viewer also draws zoom-out and zoom-in controls, for a
 * pointer with no wheel and no second finger. Once a reader stops zooming, and
 * at once for a key or a zoom control, the live region says the new scale in
 * the words of `zoom-status-label`, such as "Zoomed to 150%".
 *
 * Each item is a slide: a `group` with the role description in
 * `slide-role-label`, named by its `label` or by `slide-label`. A touch or a pen
 * swiped across the picture shows the next or the previous item, the way the
 * line of text runs.
 *
 * A press on the empty area around the item closes the viewer, as a press on
 * the backdrop does. Under `max-zoom`, a press beside the item zooms on a
 * double press and closes nothing, and only the space outside the viewport
 * closes the viewer. A press that dragged closes nothing.
 *
 * **Keyboard.** Opening moves focus to the viewer itself, which a screen
 * reader names.
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Shows the next item. On a right-to-left page, Left does. While the item is zoomed, the arrows move about it instead. |
 * | Left, Up | Shows the previous item. |
 * | Home, End | Shows the first or the last item. |
 * | `+`, `-`, `0` | Zooms in, zooms out, and puts the item back at its own size, where `max-zoom` allows zooming. |
 * | Tab, Shift+Tab | Moves through the controls in the viewer, from the last round to the first and from the first round to the last. |
 * | Escape | Closes the viewer. A `helix-before-close` listener can refuse. |
 *
 * A development build warns when a viewer opens with no `label`.
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
 * @slot zoom-in-icon - Replaces the glyph inside the zoom-in control.
 * @slot zoom-out-icon - Replaces the glyph inside the zoom-out control.
 *
 * @event {Event} close - Fired when the viewer closes. The component dispatches it again from the host, because the dialog's own event does not leave the shadow root.
 * @event {HelixActivateEvent} helix-activate - Fired after the shown item changes, when the element already holds the new item.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the shown item changes. Cancelable: cancel it to keep the current item. It is the only way to stop the change.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the viewer closes. Cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the viewer opens. Cancelable.
 * @event {ToggleEvent} toggle - Fired when the viewer opens or closes, with `newState` and `oldState`.
 *
 * @csspart counter - The place of the shown item in the set, drawn with `counter`.
 * @csspart dialog - The native dialog element.
 * @csspart dismiss - The close control, drawn with `controls`.
 * @csspart dismiss-mark - The glyph on the close control, where none is slotted.
 * @csspart footer - The slot the footer is in. It draws no box until you give it one.
 * @csspart header - The slot the header is in. It draws no box until you give it one.
 * @csspart live - The live region that announces which item is shown, and the scale once a reader has zoomed.
 * @csspart next - The control that shows the next item, drawn with `controls`.
 * @csspart next-mark - The glyph on the next control, where none is slotted.
 * @csspart previous - The control that shows the previous item, drawn with `controls`.
 * @csspart previous-mark - The glyph on the previous control, where none is slotted.
 * @csspart viewport - The box the current item is shown in.
 * @csspart zoom-in - The control that zooms in by half again, drawn with `controls` where `max-zoom` allows zooming.
 * @csspart zoom-in-mark - The glyph on the zoom-in control, where none is slotted.
 * @csspart zoom-out - The control that zooms back out, drawn with `controls` where `max-zoom` allows zooming.
 * @csspart zoom-out-mark - The glyph on the zoom-out control, where none is slotted.
 *
 * @cssproperty --lightbox-pan-x - How far the zoomed item is moved across from the middle of the viewport, in pixels, toward the right. Written only while zoomed.
 * @cssproperty --lightbox-pan-y - How far the zoomed item is moved down from the middle of the viewport, in pixels. Written only while zoomed.
 * @cssproperty --lightbox-zoom - The scale the shown item is zoomed to, such as `2`. Written only while zoomed.
 *
 * @cssstate entering - From the moment the viewer opens until its entrance has finished.
 * @cssstate exiting - From the moment the viewer closes until its exit has finished.
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
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-lightbox': { nextLabel: 'Weiter' } })`.
   */
  static words = 'helix-lightbox'

  /**
   * Draws the viewer's own previous, next and close controls over the picture,
   * and zoom-out and zoom-in controls where `max-zoom` allows zooming.
   *
   * Off by default, for a viewer whose chrome you compose in the `header` and
   * `footer` slots. The controls hide with the rest of the chrome while the
   * reader is idle, the previous and next ones say they are unavailable at
   * either end of a set that does not `loop`, and the zoom ones at either end
   * of the scale.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * Draws the place of the shown item in the set over the picture, in the
   * words of `status-label`, such as "2 of 5". It hides with the controls while
   * the reader is idle. Screen readers hear the place from the live region, so
   * the drawn copy is hidden from them.
   */
  @property({ reflect: true, type: Boolean })
  counter = false

  /**
   * The close control's accessible name. Translate it with the rest of your
   * interface.
   */
  @words
  @property({ attribute: 'dismiss-label' })
  dismissLabel = 'Close'

  /** The viewer's name where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Lightbox'

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
  @words
  @property({ attribute: 'next-label' })
  nextLabel = 'Next'

  /**
   * The previous control's accessible name.
   */
  @words
  @property({ attribute: 'previous-label' })
  previousLabel = 'Previous'

  /**
   * The name of an item with no `label` of its own, with `{index}` and
   * `{count}` filled in, written in the locale.
   */
  @words
  @property({ attribute: 'slide-label' })
  slideLabel = '{index} of {count}'

  /**
   * The word screen readers announce in place of an item's role, set as
   * `aria-roledescription`. Translate it with the rest of your text, or empty
   * it to leave the role as `group`.
   */
  @words
  @property({ attribute: 'slide-role-label' })
  slideRoleLabel = 'slide'

  /**
   * The status text that says which item is shown, with `{index}`, `{count}`
   * and the item's `{label}` filled in, the numbers written in the locale.
   *
   * Announced rather than only drawn, because the picture changing under a
   * reader who cannot see it is otherwise silent. A consumer who has their own
   * counter in the chrome can empty this and say it themselves.
   */
  @words
  @property({ attribute: 'status-label' })
  statusLabel = '{index} of {count}'

  /**
   * The zoom-in control's accessible name.
   */
  @words
  @property({ attribute: 'zoom-in-label' })
  zoomInLabel = 'Zoom in'

  /**
   * The zoom-out control's accessible name.
   */
  @words
  @property({ attribute: 'zoom-out-label' })
  zoomOutLabel = 'Zoom out'

  /**
   * What the live region says once a reader has stopped zooming. `{scale,
   * number, percent}` writes the scale as a percentage the way the locale
   * writes one, such as `150%`, or `150 %` in French. `{percent}` is the same
   * scale as a whole number, for a sentence that places the sign itself. Empty
   * it to say nothing.
   */
  @words
  @property({ attribute: 'zoom-status-label' })
  zoomStatusLabel = 'Zoomed to {scale, number, percent}'

  /** Whether the reader has been still long enough to hide the chrome. */
  @state()
  private resting = false

  /** Whether the viewer is filling the screen. */
  @state()
  private filled = false

  /** What the live region is currently saying. */
  @state()
  private announcement = ''

  /** The scale the shown item is drawn at, which the zoom controls read. */
  @state()
  private zoomScale = 1

  /* The scale is said once a reader stops zooming, and not at every step of
     a pinch. */
  private readonly zoomSaid = new DelayController(this, { renders: false })

  /** Whether the zoom is being put back because the item changed, which says nothing. */
  private quietZoom = false

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

  /* `Tab` from the last control goes to the first, and `Shift+Tab` from the
     first to the last, as in `Dialog`. A native modal lets `Tab` past its last
     control out to the browser's own controls. */
  protected readonly scope = new FocusScopeController(this, {
    contain: () => this.open,
    contents: () => [
      ...['header', '', 'footer'].flatMap(
        (name) =>
          this.renderRoot
            ?.querySelector<HTMLSlotElement>(name ? `slot[name="${name}"]` : 'slot:not([name])')
            ?.assignedElements({ flatten: true }) ?? [],
      ),
      /* And the controls the viewer draws itself. */
      ...[...(this.dialog?.children ?? [])].filter((one) => one.localName === 'button'),
    ],
    surface: () => this.dialog,
  })

  /* `:state(entering)` and `:state(exiting)`, for a stylesheet drawing the
     journey in or out, as `Dialog` records them. */
  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.dialog,
  })

  /* Pinch, double press, drag and the wheel, about the viewport. */
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
    if (scale !== this.zoomScale) {
      this.zoomScale = scale
      this.sayZoom()
    }
  }

  /** Whether the zoom is changing by one discrete step, a key or a control, which is said at once. */
  private zoomStep = false

  /**
   * Says the new scale in the live region: a moment after the last change of
   * a pinch, a drag or the wheel, and at once for a key or a zoom control,
   * which is one change a reader is waiting to hear. Said only after the
   * pause, a reader pressing `+` heard nothing until it ended.
   */
  private sayZoom(): void {
    if (this.quietZoom || !this.open || this.zoomStatusLabel === '') {
      this.zoomSaid.cancel()
      return
    }
    this.zoomSaid.start(this.zoomStep ? 0 : 400, () => {
      this.announcement = formatWords(this, 'zoomStatusLabel', {
        percent: percentOf(this.zoomScale),
        scale: this.zoomScale,
      })
    })
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
      '[part="previous"], [part="next"], [part="dismiss"], [part="zoom-in"], [part="zoom-out"]',
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
    expanded: () => this.open,
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

  /**
   * The set changed: render it again.
   *
   * `items` is read on each render and nothing else marks a render as due when
   * an item arrives or leaves, so an item appended after the first render had
   * no role description, no place in the set, and no part in the count until
   * some unrelated property changed.
   */
  private readonly handleSlotChange = (): void => {
    this.requestUpdate()
  }

  /**
   * Watches each item's `label` and `value`, which no slot reports.
   *
   * `value` decides which item `active` names, and `label` fills `{label}` in
   * `status-label` and `slide-label`. A change to either left the old item
   * shown, or the old words in the counter, until some unrelated property
   * changed. `Select` watches its options for the same reason.
   *
   * The subtree, since an observer on the host sees no attribute on its
   * children otherwise. Only changes on the items themselves count: a `<progress
   * value>` inside an item, updated while a video plays, would otherwise render
   * the viewer again on each update.
   *
   * Made on connection, there being no `MutationObserver` on a server.
   */
  private itemWatch: MutationObserver | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.itemWatch = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.target instanceof HelixHeadlessLightboxItem &&
            record.target.parentElement === this,
        )
      ) {
        this.requestUpdate()
      }
    })
    this.itemWatch.observe(this, { attributeFilter: ['label', 'value'], subtree: true })
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
      this.requestActive(keyOf(target, next))
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
    if (this.zoomKey(event.key) || this.panKey(event.key)) {
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
    if (key === '+' || key === '=') {
      this.zoomIn()
    } else if (key === '-') {
      this.zoomOut()
    } else if (key === '0') {
      this.stepZoom(() => this.zoomer.reset())
    } else {
      return false
    }
    return true
  }

  /**
   * The arrow keys on a zoomed item, which move about it rather than to
   * another item. Returns whether it was one.
   */
  private panKey(key: string): boolean {
    if (this.zoomer.scale <= 1) {
      return false
    }
    const box = this.partNamed('viewport')?.getBoundingClientRect()
    const across = Math.max(40, (box?.width ?? 0) / 10)
    const down = Math.max(40, (box?.height ?? 0) / 10)
    const by = {
      ArrowDown: { x: 0, y: -down },
      ArrowLeft: { x: across, y: 0 },
      ArrowRight: { x: -across, y: 0 },
      ArrowUp: { x: 0, y: down },
    }[key]
    if (!by) {
      return false
    }
    this.zoomer.panBy(by)
    return true
  }

  /** Zooms in by half again, as `+` and the zoom-in control do. */
  private zoomIn(): void {
    this.stepZoom(() => this.zoomer.zoomTo(this.zoomer.scale * 1.5))
  }

  /** Zooms out by as much, as `-` and the zoom-out control do. */
  private zoomOut(): void {
    this.stepZoom(() => this.zoomer.zoomTo(this.zoomer.scale / 1.5))
  }

  /** Changes the zoom by one discrete step, which `sayZoom` says at once. */
  private stepZoom(change: () => void): void {
    this.zoomStep = true
    try {
      change()
    } finally {
      this.zoomStep = false
    }
  }

  /** Home and End, which are an index rather than a step. */
  private toEnd(at: number): void {
    const target = this.items[at]
    if (target && target !== this.shown) {
      this.requestActive(keyOf(target, at))
    }
  }

  /** The item shown at the last update, whose zoom a different item does not keep. */
  private zoomedItem: HelixHeadlessLightboxItem | undefined = undefined

  /** The item on screen: the one `active` names, or the first where it names none. */
  private get shown(): HelixHeadlessLightboxItem | undefined {
    return this.named(this.items)
  }

  /** The item `active` names, by `value` or by place, or the first where it names none. */
  private named(items: HelixHeadlessLightboxItem[]): HelixHeadlessLightboxItem | undefined {
    const keyed = items.map((item, index) => ({ item, value: keyOf(item, index) }))
    return resolveActiveItem(this.active ?? '', keyed)?.item
  }

  /**
   * Requests a new shown item, and returns whether it moved.
   *
   * Where `active` names nothing, it is first written with the item on
   * screen, so `helix-activate` names the item you saw as `previous`.
   */
  override requestActive(next: string, cause?: string): boolean {
    const items = this.items
    const shown = this.active === '' ? this.shown : undefined
    if (shown) {
      this.active = keyOf(shown, items.indexOf(shown))
    }
    return super.requestActive(next, cause)
  }

  /**
   * A press on the backdrop or on the empty area around the item.
   *
   * A modal `<dialog>` attributes backdrop presses to itself, and the styled
   * tier draws the viewer over the whole screen, so a press beside the item
   * lands on the dialog, the viewport, or the item's own box. Any of those is
   * a reader done with the viewer, as a press on a dark room around a picture
   * is. Not a press that dragged, which was a swipe or a pan.
   */
  private readonly handleBackdrop = (event: MouseEvent): void => {
    if (this.dragged(event) || !this.onEmptyArea(event)) {
      return
    }
    this.requestOpen(false)
  }

  /** Where the last press began, so a press that dragged closes nothing. */
  private pressedAt: { x: number; y: number } | undefined

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pressedAt = { x: event.clientX, y: event.clientY }
  }

  /** Whether the press moved further than a click does, as a swipe or a pan does. */
  private dragged(event: MouseEvent): boolean {
    const from = this.pressedAt
    this.pressedAt = undefined
    return from !== undefined && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8
  }

  /**
   * Whether a press landed on the empty area around the item: the viewer's
   * own surface, the viewport, or an item's box beside what it holds. The
   * last two not where `max-zoom` lets a reader zoom, since a double press
   * there zooms.
   */
  private onEmptyArea(event: MouseEvent): boolean {
    const pressed = event.composedPath()[0]
    if (!(pressed instanceof Element)) {
      return false
    }
    if (pressed === this.dialog) {
      return true
    }
    if (this.maxZoom > 1) {
      return false
    }
    const root = pressed.getRootNode()
    const inItem =
      root instanceof ShadowRoot &&
      root.host instanceof HelixHeadlessLightboxItem &&
      pressed.getAttribute('part') === 'item'
    return inItem || pressed === this.partNamed('viewport')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
    this.toggleState('fullscreen', this.filled)
    this.toggleState('idle', this.resting)
    this.toggleState('zoomable', this.maxZoom > 1)
    /* Every item starts at its own size, and a closed viewer keeps no zoom.
       Checked against the shown item, since `active` stays the same when the
       shown item is removed or its `value` is renamed. */
    const shown = this.shown
    if (shown !== this.zoomedItem || (changed.has('open') && !this.open)) {
      this.quietZoom = true
      this.zoomer.reset()
      this.quietZoom = false
    }
    this.zoomedItem = shown
    /* Before render and not after, or the region renders one move behind: the
       reading is this element's own state, so computing it in `updated` puts it
       into the *next* render and announces the picture the reader has just left. */
    this.say(changed)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    unlockScroll(this)
    this.itemWatch?.disconnect()
    this.itemWatch = undefined
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
      /* Asked once the viewer first opens, as `Dialog` asks: a viewer named
         by `fallback-label` alone is announced as "Lightbox". */
      auditName(
        this,
        () => null,
        'Give it a `label`, such as "Project photos".',
        () => this.label !== '',
      )
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
    const current = this.named(items)
    items.forEach((item, at) => {
      item.current = item === current
      /* Once the item has hydrated, so its first render is the server's. */
      whenHydrated(item, () => {
        item.position = formatWords(this, 'slideLabel', {
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
    const current = this.named(items)
    const at = current ? items.indexOf(current) : -1
    this.announcement =
      at === -1 || !current
        ? ''
        : formatWords(this, 'statusLabel', {
            count: items.length,
            index: at + 1,
            label: current.label,
          })
  }

  /** The shown item's place in the set, in the words of `status-label`. */
  private place(): string {
    const items = this.items
    const current = this.named(items)
    return current
      ? formatWords(this, 'statusLabel', {
          count: items.length,
          index: items.indexOf(current) + 1,
          label: current.label,
        })
      : ''
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
      aria-label=${this.label || this.fallbackLabel}
      autofocus
      tabindex="-1"
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
      @focusin=${this.idle.stir}
      @keydown=${this.handleKeydown}
      @pointerdown=${this.handlePointerDown}
      @pointerleave=${this.idle.leave}
      @pointermove=${this.idle.stir}
    >
      <slot name="header" part="header"></slot>
      <div part="viewport">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
      <slot name="footer" part="footer"></slot>
      ${this.controls ? this.renderControls() : nothing}
      ${this.counter ? html`<span part="counter" aria-hidden="true">${this.place()}</span>` : nothing}
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
      ${this.maxZoom > 1 ? this.renderZoomControls() : nothing}
      ${drawDismiss({
        label: this.dismissLabel,
        mark: html`<slot name="dismiss-icon">${drawDismissGlyph()}</slot>`,
        onDismiss: () => this.close(),
      })}`
  }

  /**
   * Zoom out and zoom in, for a pointer with no wheel and no second finger.
   *
   * Out before in, so they read as a scale runs. `aria-disabled` at either
   * limit, as the previous and next controls are at the ends.
   */
  protected renderZoomControls(): TemplateResult {
    return html`<button
        part="zoom-out"
        type="button"
        aria-label=${this.zoomOutLabel}
        aria-disabled=${this.zoomScale <= 1 ? 'true' : nothing}
        @click=${() => this.zoomOut()}
      >
        <slot name="zoom-out-icon">
          <svg part="zoom-out-mark" fill="currentColor" viewBox=${minus.viewBox} aria-hidden="true">
            ${unsafeSVG(minus.content)}
          </svg>
        </slot>
      </button>
      <button
        part="zoom-in"
        type="button"
        aria-label=${this.zoomInLabel}
        aria-disabled=${this.zoomScale >= this.maxZoom ? 'true' : nothing}
        @click=${() => this.zoomIn()}
      >
        <slot name="zoom-in-icon">
          <svg part="zoom-in-mark" fill="currentColor" viewBox=${plus.viewBox} aria-hidden="true">
            ${unsafeSVG(plus.content)}
          </svg>
        </slot>
      </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-lightbox': HelixHeadlessLightbox
  }
}
