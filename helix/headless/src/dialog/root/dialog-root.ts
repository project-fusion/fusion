import {
  AriaForwardController,
  CommandController,
  customElement,
  drawDismiss,
  drawDismissGlyph,
  FocusScopeController,
  HelixElement,
  headingsIn,
  hostAria,
  lockScroll,
  MixinControllerOpen,
  OpenPhaseController,
  reflectElements,
  unlockScroll,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { wordsIn } from '../description.js'

/**
 * @summary A modal window built on the native `<dialog>` element.
 *
 * @description
 * Renders a native `<dialog>` opened with `showModal()`. The platform provides:
 *
 * - the top layer, so the dialog is above everything whatever the `z-index`
 * - a backdrop
 * - closing with Escape
 * - an inert page behind the dialog, unreachable by pointer, keyboard, or
 *   virtual cursor
 *
 * The dialog adds one thing to those: `Tab` from its last control goes to its
 * first, and `Shift+Tab` from its first to its last. A native modal lets `Tab`
 * past its last control out to the browser's own controls.
 *
 * `open` calls `showModal()`, and every way the dialog closes goes through
 * `requestOpen`. A native dialog closes three ways: the property, Escape, and a
 * `<form method="dialog">` submit. Routing all three through `requestOpen`
 * keeps your state in step, so the dialog never closes while your state still
 * says it is open, which would leave it impossible to reopen.
 *
 * The dialog's name is `label` when you set it. Otherwise it is the heading in
 * the `header` slot, or the elements an `aria-labelledby` on the host names.
 * While it is open, the page behind it does not scroll.
 *
 * The dialog is described by the words at the start of its body: the elements
 * in the default slot before the first one that is or holds a control. A
 * question above a form describes the dialog, and the form does not. A Helix
 * component that draws words and no control, such as `Text`, counts as words. An
 * `aria-describedby` on the host replaces it.
 *
 * Set `alert` for a dialog that interrupts to ask for an answer, such as a
 * confirmation before a deletion. It is an `alertdialog`, which a screen reader
 * announces with its description as it opens. Set `dismissible` to draw a
 * close control, labeled by `dismiss-label`.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @aliases Modal, Sheet
 * @documentation https://fusion.dev/helix/components/dialog
 *
 * @slot - The dialog's content.
 * @slot dismiss-icon - Replaces the glyph inside the close control.
 * @slot footer - The dialog's actions.
 * @slot header - The title, and anything beside it.
 * @slot icon - An icon above the title, for a warning dialog.
 *
 * @event {Event} close - Sent from the host after the dialog closes, because the native `close` event does not leave the shadow root.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before it opens, and cancelable.
 * @event {ToggleEvent} toggle - Sent when the dialog opens or closes, with `newState` and `oldState`.
 *
 * @csspart body - The slot the content is in. It draws no box until you give it one.
 * @csspart dialog - The native dialog element.
 * @csspart dismiss - The close control, drawn when the dialog is `dismissible`.
 * @csspart dismiss-mark - The glyph on the close control, where none is slotted.
 * @csspart footer - The slot the actions are in. It draws no box until you give it one.
 * @csspart header - The slot the title is in. It draws no box until you give it one.
 *
 * @cssstate entering - From the moment the dialog opens until its entrance has finished.
 * @cssstate exiting - From the moment the dialog closes until its exit has finished.
 * @cssstate open - While the dialog is open.
 */
@customElement('helix-headless-dialog')
export class HelixHeadlessDialog extends MixinControllerOpen(HelixElement) {
  /**
   * Makes the dialog an alert dialog, for a message that interrupts to ask for
   * an answer, such as a confirmation before something is deleted.
   *
   * The `<dialog>` takes `role="alertdialog"`, so a screen reader announces the
   * dialog and its description as it opens. Everything else stays the same:
   * the dialog is modal, Escape asks to close it, and `persistent` still
   * refuses that.
   *
   * Not reflected, because no stylesheet selects on it.
   */
  @property({ type: Boolean })
  alert = false

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
   * Draws a control that closes the dialog, in the corner where the title is.
   *
   * Pressing it is `close()`, so it sends `helix-before-close` like every other
   * way out, and `persistent` does not disable it.
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
   * Accessible name for the dialog. When it is empty, the heading in the
   * `header` slot names the dialog.
   */
  @property()
  label = ''

  /* `:state(entering)` and `:state(exiting)`, for a stylesheet drawing the
     journey in or out. */
  protected readonly phases = new OpenPhaseController(this, {
    mark: {
      entering: (on) => this.toggleState('entering', on),
      exiting: (on) => this.toggleState('exiting', on),
    },
    open: () => this.open,
    surface: () => this.dialog,
  })

  /* `aria-labelledby` and `aria-describedby` written on the host, carried to
     the `<dialog>` that is the node a reader is on. */
  protected readonly aria = new AriaForwardController(this, { target: () => this.dialog })

  /* Opened and closed from anywhere on the page, without a line of script:
     `<helix-headless-button commandfor="…" command="--show">`. See `CommandController`
     for why this is the platform's invoker rather than a `data-` recipe. */
  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.close(),
      '--show': () => this.show(),
      '--toggle': () => this.toggleOpen(),
    },
  })

  /**
   * Stops Escape and a press on the backdrop from closing the dialog.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   *
   * A persistent dialog does not ignore that press. It answers it: see
   * `refuse`, which is the only way a dialog that will not be dismissed can say
   * so at the moment a reader asks.
   */
  @property({ reflect: true, type: Boolean })
  persistent = false

  /**
   * What the dialog closed with, the way `<dialog>` reports it.
   *
   * **The whole point of a `<dialog>` returning a value is lost behind a shadow
   * boundary**, which is where this one is: the platform's contract is
   * `close(value)` then read `returnValue`, and `querySelector` does not reach
   * the element to do either. A confirmation asking which button was pressed is
   * the ordinary case.
   *
   * Held here as well as on the element, so a value set before the first render
   * survives to it and a consumer reading one back gets what they wrote.
   */
  get returnValue(): string {
    return this.dialog?.returnValue ?? this.returned
  }

  set returnValue(value: string) {
    this.returned = value
    const dialog = this.dialog
    if (dialog) {
      dialog.returnValue = value
    }
  }

  /** What a value set before the element existed is kept in. */
  private returned = ''

  /** The native dialog, or nothing where there is no DOM to hold one. */
  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  /** Opens the dialog, moves focus into it, and makes the rest of the page inert. */
  show(): void {
    this.requestOpen(true)
  }

  /**
   * Requests that the dialog close. A `helix-before-close` listener can cancel
   * the request.
   *
   * Takes what the dialog closed with, the way `<dialog>.close(value)` does, so
   * the button that dismissed it can say which one it was. Set before the
   * request rather than after, because a `close` listener reads `returnValue`
   * and would otherwise read the previous one.
   *
   * Not set where the request is refused, since nothing closed and a value
   * saying it did would outlive the refusal.
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
   * Escape, intercepted so it is a request rather than an act.
   *
   * The native `cancel` event fires before the dialog closes, so preventing it
   * leaves the dialog open and lets `requestOpen` decide. Without this a reader
   * pressing Escape would close a dialog its consumer had said was open, and
   * the two would disagree until something else moved.
   */
  private readonly handleCancel = (event: Event): void => {
    event.preventDefault()
    if (this.persistent) {
      return
    }
    this.requestOpen(false)
  }

  /**
   * A close that happened anyway, reflected back.
   *
   * `<form method="dialog">` closes the dialog directly and there is no event
   * to prevent. Rather than fight it, the state follows: the dialog is shut, so
   * saying otherwise would be a lie the next `showModal()` would trip over.
   */
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
   * A `<form method="dialog">` slotted into the dialog, closed the way the
   * platform closes its own.
   *
   * **The platform cannot find this dialog from the form.** A submit with the
   * `dialog` method closes the nearest `<dialog>` ancestor, and a slotted form's
   * ancestors are the light DOM, where there is none. So the submit is read
   * here, and the submitter's `value` is the `returnValue`, as it would be.
   */
  private readonly handleSubmit = (event: SubmitEvent): void => {
    const form = event.target
    if (!(form instanceof HTMLFormElement) || form.closest('dialog')) {
      return
    }
    const submitter = event.submitter as HTMLButtonElement | HTMLInputElement | null
    const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
    if (method !== 'dialog') {
      return
    }
    event.preventDefault()
    this.close(submitter?.hasAttribute('value') ? submitter.value : undefined)
  }

  /** Whether the `header` slot's heading is what currently names the dialog. */
  private namedByHeader = false

  /**
   * Names the dialog by its heading, where nothing else names it.
   *
   * An element reference, because the heading is in the light DOM and the
   * `<dialog>` is in this shadow root, which an IDREF cannot cross. `label` and
   * an `aria-labelledby` on the host come first, so this steps aside for
   * either. A browser without element reflection keeps the fallback name.
   */
  private nameByHeader(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="header"]')
    const heading =
      this.label || this.hasAttribute('aria-labelledby')
        ? []
        : headingsIn(slot?.assignedElements({ flatten: true }) ?? [])
    this.namedByHeader = reflectElements(
      this.dialog,
      'ariaLabelledByElements',
      heading,
      this.namedByHeader,
    )
  }

  /* `Tab` from the last control goes to the first, and `Shift+Tab` from the
     first to the last. A native modal lets `Tab` past its last control out to
     the browser's own controls, which takes a keyboard reader out of the page. */
  protected readonly scope = new FocusScopeController(this, {
    contain: () => this.open,
    contents: () => [
      ...['icon', 'header', '', 'footer'].flatMap(
        (name) =>
          this.renderRoot
            ?.querySelector<HTMLSlotElement>(name ? `slot[name="${name}"]` : 'slot:not([name])')
            ?.assignedElements({ flatten: true }) ?? [],
      ),
      /* And what the dialog draws itself besides its slots, its close control. */
      ...[...(this.dialog?.children ?? [])].filter((one) => !(one instanceof HTMLSlotElement)),
    ],
    surface: () => this.dialog,
  })

  /** Whether the body's words are what currently describe the dialog. */
  private describedByBody = false

  /**
   * Describes the dialog by the words at the start of its body, where nothing
   * else describes it.
   *
   * An element reference, for the reason `nameByHeader` gives. Only the leading
   * run of elements that hold no control, so a dialog asking a question above a
   * form is described by the question: a description that read out every field
   * label would repeat what a reader hears again as they reach each field. An
   * `aria-describedby` on the host comes first.
   */
  private describeByBody(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])')
    const words = this.hasAttribute('aria-describedby') ? [] : wordsIn(slot)
    this.describedByBody = reflectElements(
      this.dialog,
      'ariaDescribedByElements',
      words,
      this.describedByBody,
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('submit', this.handleSubmit)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('submit', this.handleSubmit)
    unlockScroll(this)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.nameByHeader()
    this.describeByBody()
    if (this.open) {
      lockScroll(this)
    } else {
      unlockScroll(this)
    }
    /* After render, because the element has to exist to be opened, and only on
       a difference: `showModal()` on an open dialog throws, and `close()` on a
       shut one fires a second `close` event. */
    const dialog = this.dialog
    if (!dialog) {
      return
    }
    if (this.open && !dialog.open) {
      /* **After the slotted elements have rendered, or the modal focuses
         itself.** `showModal()` moves focus to the first focusable descendant,
         and a custom element that has not rendered its shadow yet has none: the
         browser falls back to the dialog. Markup never showed this, the parser
         having upgraded everything before this element's first update, and
         React does: it creates and connects the dialog before the chat inside
         it has rendered, so a `default-open` dialog opened with focus on the
         dialog rather than on the field, measured against the markup twin.

         Awaited only for children that are Lit elements and only on the way
         open; a dialog with no such children resolves on the same microtask and
         is unchanged. */
      void this.openWhenSlotted(dialog)
    } else if (!this.open && dialog.open) {
      dialog.close()
    }
  }

  /** Opens once anything slotted has had its first render. See `updated`. */
  private async openWhenSlotted(dialog: HTMLDialogElement): Promise<void> {
    await Promise.all(
      [...this.children]
        .map((one) => (one as Partial<{ updateComplete: Promise<unknown> }>).updateComplete)
        .filter((one): one is Promise<unknown> => one instanceof Promise),
    )
    /* Re-checked, because both facts can have moved while that resolved. */
    if (this.open && !dialog.open && this.isConnected) {
      dialog.showModal()
    }
  }

  /**
   * A press on the backdrop, which lands on the dialog element itself.
   *
   * **The target alone is not enough.** A modal `<dialog>` attributes backdrop
   * clicks to itself, which is the usual trick, and this panel also carries
   * `--dialog-padding` of padding: a press in that padding has the same target
   * as a press on the backdrop, so the trick alone closes a dialog when a reader
   * clicks just inside its own edge. So the point is compared against the
   * panel's box. `Drawer` does the same.
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
    if (this.persistent) {
      this.refuse()
      return
    }
    this.requestOpen(false)
  }

  /**
   * Says no to a dismissal, by moving.
   *
   * A persistent dialog that ignores a press on the backdrop is
   * indistinguishable from one that did not notice, and a reader's next move is
   * to press again harder. A short swell and settle is the smallest thing that
   * reads as "I heard you, and no": it is the same gesture a native alert makes
   * on macOS and the one every reader has already been taught.
   *
   * An attribute for the length of the animation rather than a class, cleared
   * on `animationend`, so the styled tier decides what refusing looks like and
   * this decides only when it happens. Removed first so a second press
   * restarts it: without that, pressing twice does nothing the second time,
   * which is the impression the whole thing exists to avoid.
   *
   * **`once: true` is not a release when the event cannot arrive.** A sheet
   * that sets `animation: none` under `prefers-reduced-motion: reduce` runs
   * none, so `animationend` never fires, and every refused press left a
   * listener that could not be removed and an attribute that stayed on. The
   * controller bounds it to one listener, aborted before the next is added.
   *
   * **And the attribute is cleared at once when no animation is running**, asked
   * of the platform rather than of a media query: this tier does not know what
   * refusing looks like, and the same silence arrives from a consumer's
   * stylesheet, from reduced motion, and from no styled tier being loaded at
   * all.
   *
   * **`CSSAnimation` specifically, because `getAnimations` returns transitions
   * too.** A panel that is still running its entrance transition answers the
   * bare `length` check with a truthy number while no animation exists to end,
   * so a refusal landing inside that window took the listener branch and waited
   * for an `animationend` that was never coming: the attribute stayed on until
   * the next refused press. That is the same bug this method exists to close,
   * one window narrower. `getAnimations` flushes pending style itself, so no
   * reflow is forced for it.
   */
  private refuse(): void {
    const panel = this.dialog
    if (!panel) {
      return
    }
    this.refusal?.abort()
    panel.removeAttribute('data-refused')
    // Read forces the removal to land before the attribute goes back on, or the
    // two happen in one frame and the animation never restarts.
    void panel.offsetWidth
    panel.setAttribute('data-refused', '')
    const animating = panel.getAnimations().some((one) => one instanceof CSSAnimation)
    if (!animating) {
      panel.removeAttribute('data-refused')
      return
    }
    this.refusal = new AbortController()
    panel.addEventListener('animationend', () => panel.removeAttribute('data-refused'), {
      once: true,
      signal: this.refusal.signal,
    })
  }

  /** Bounds the refusal listener to one, whether or not it ever fires. */
  private refusal: AbortController | undefined

  /**
   * The glyph on the close control, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting, and a method, so a
   * tier above replaces it by overriding. The same pair `Toast.Item` draws.
   */
  protected renderDismissIcon(): TemplateResult {
    return html`<slot name="dismiss-icon">
      ${drawDismissGlyph()}
    </slot>`
  }

  protected override render(): TemplateResult {
    /* The three regions are parts on their slots, with no wrapper, so a region
       nobody filled still draws no box, and a stylesheet that wants a box gives
       the slot a `display`. The close control comes last, so
       opening still focuses the first control in the content. */
    return html`<dialog
      part="dialog"
      role=${this.alert ? 'alertdialog' : nothing}
      closedby=${this.closedBy ?? nothing}
      aria-label=${this.label || 'Dialog'}
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
    >
      <slot name="icon"></slot>
      <slot name="header" part="header" @slotchange=${this.nameByHeader}></slot>
      <slot part="body" @slotchange=${this.describeByBody}></slot>
      <slot name="footer" part="footer"></slot>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-dialog': HelixHeadlessDialog
  }
}
