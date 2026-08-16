import {
  CommandController,
  customElement,
  HelixElement,
  hostAria,
  MixinControllerOpen,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A modal window, on the platform's own dialog.
 *
 * @description
 * A real `<dialog>` opened with `showModal()`, not a div with a role and a
 * hand-built trap. The platform gives four things that are each a day's work to
 * reimplement and easy to get subtly wrong: the top layer, so the dialog is
 * above everything regardless of what `z-index` anyone else wrote; a real
 * backdrop; Escape; and inert-behind, so the page underneath is not reachable
 * by pointer, keyboard, or a screen reader's virtual cursor.
 *
 * **`open` drives `showModal()`, and every way it can close comes back through
 * `requestOpen`.** A native dialog can close from three directions: the
 * property, Escape, and a `<form method="dialog">` submit inside it. Left
 * alone, two of those would shut the dialog while the consumer's state still
 * said open, which is the bug that makes a modal impossible to reopen. Escape
 * is intercepted and routed through the request, so `preventDefault()` on the
 * `helix-close` refuses it; a close that happens anyway is reflected back.
 *
 * **Nothing here traps focus.** `showModal()` does it, and better: `inert` on
 * the rest of the document is something no JavaScript trap can achieve.
 * `FocusTrapController` stays for the surfaces that are not modal.
 *
 * The regions are bare slots rather than wrappers, for the reason the card's
 * are: an unassigned `<slot>` is `display: contents` and generates no box, so a
 * dialog with no footer has no empty band where one would be.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Modal, Lightbox, Sheet
 * @documentation https://helix.fusion.dev/components/dialog
 *
 * Opened declaratively with the platform's invoker attributes:
 *
 * ```html
 * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
 * <helix-dialog id="confirm">…</helix-dialog>
 * ```
 *
 * `--show`, `--close` and `--toggle`. Custom commands rather than the built-in
 * `show-modal`, because those are defined against native elements and do
 * nothing when pointed at a custom one.
 *
 * @slot - The dialog's content.
 * @slot header - The title, and anything beside it.
 * @slot footer - The actions.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 *
 * @csspart dialog - The native dialog element.
 */
@customElement('helix-base-dialog')
export class HelixBaseDialog extends MixinControllerOpen(HelixElement) {
  /** Accessible name for the dialog. */
  @property()
  label = ''

  /**
   * Whether Escape and the backdrop can close it.
   *
   * Off for a dialog that must be answered. It does not disable the close
   * control a consumer slots in: refusing to be dismissed is not the same as
   * refusing to be closed, and a dialog with no way out at all is a trap.
   */
  @property({ reflect: true, type: Boolean })
  persistent = false

  /* Opened and closed from anywhere on the page, without a line of script:
     `<helix-button commandfor="…" command="--show">`. See `CommandController`
     for why this is the platform's invoker rather than a `data-` recipe. */
  protected readonly commands = new CommandController(this, {
    commands: {
      '--close': () => this.close(),
      '--show': () => this.show(),
      '--toggle': () => this.toggleOpen(),
    },
  })

  /** The native dialog, or nothing where there is no DOM to hold one. */
  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null
  }

  /** Moves focus into the dialog and makes the rest of the page inert. */
  show(): void {
    this.requestOpen(true)
  }

  /** Asks to close, which a consumer may refuse. */
  close(): void {
    this.requestOpen(false)
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
  private readonly handleClose = (): void => {
    if (this.open) {
      this.requestOpen(false)
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After render, because the element has to exist to be opened, and only on
       a difference: `showModal()` on an open dialog throws, and `close()` on a
       shut one fires a second `close` event. */
    const dialog = this.dialog
    if (!dialog) {
      return
    }
    if (this.open && !dialog.open) {
      dialog.showModal()
    } else if (!this.open && dialog.open) {
      dialog.close()
    }
  }

  protected override render(): TemplateResult {
    return html`<dialog
      part="dialog"
      aria-label=${this.label || 'Dialog'}
      @cancel=${this.handleCancel}
      @close=${this.handleClose}
    >
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    </dialog>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-dialog': HelixBaseDialog
  }
}
