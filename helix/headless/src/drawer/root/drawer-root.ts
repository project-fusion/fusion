import { CommandController, customElement, HelixElement, MixinControllerOpen } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * Takes `MixinControllerOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
 * as they do on an accordion item, and a consumer already knows the API.
 *
 * Modal by default, which is three things together and not one: focus is
 * trapped inside, Escape and an outside press close it, and the page behind is
 * covered. A panel with the look of a modal and none of its behavior is worse
 * than an inline one, because it invites the reader to treat it as blocking.
 *
 * Content stays mounted when closed, so it is in the server's markup and can
 * animate. It is `inert` while closed, which takes it out of the tab order and
 * the accessibility tree without removing its box.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Sheet, Sidebar, Panel, Off-canvas
 * @documentation https://helix.fusion.dev/components/drawer
 *
 * Opened declaratively with the platform's invoker attributes:
 *
 * ```html
 * <helix-button commandfor="nav" command="--toggle">Menu</helix-button>
 * <helix-drawer id="nav">…</helix-drawer>
 * ```
 *
 * @slot - The drawer's content.
 * @slot header - Content pinned above the scrolling area.
 *
 * @csspart panel - The sliding panel.
 * @csspart header - The header region.
 * @csspart content - The scrolling content region.
 *
 * @event {HelixCloseEvent} helix-close - Fired before the panel closes, and cancelable.
 * @event {HelixOpenEvent} helix-open - Fired when the drawer opens or closes.
 */
@customElement('helix-base-drawer')
export class HelixBaseDrawer extends MixinControllerOpen(HelixElement) {
  /* Opened and closed from anywhere on the page, without a line of script:
     `<helix-button commandfor="…" command="--show">`. The same three commands
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
   * Which edge the drawer comes from.
   *
   * Unset is `end`, which the styled tier reads as `:host(:not([placement]))`
   * beside `:host([placement="end"])` rather than as a value written here: a
   * default assigned to the property would reflect onto every host and put a
   * `placement="end"` into markup no consumer wrote.
   */
  @property({ reflect: true })
  placement?: 'start' | 'end' | 'top' | 'bottom'

  /** Accessible name for the panel. */
  @property()
  label = ''

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
  @property({ type: Boolean })
  modal = true

  /** The panel, which is a real `<dialog>`. */
  private get panel(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector<HTMLDialogElement>('[part="panel"]') ?? null
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
  private readonly handleClose = (): void => {
    if (this.open) {
      this.requestOpen(false)
    }
  }

  /**
   * A press on the backdrop, which lands on the dialog element itself.
   *
   * The panel fills only part of the dialog's box, so a press beside it hits
   * the dialog and not a child. A native `<dialog>` does not close on that, and
   * it is the gesture that most obviously means close.
   */
  private readonly handleBackdrop = (event: MouseEvent): void => {
    if (event.target === this.panel && this.modal) {
      this.requestOpen(false)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After render, and only on a difference: `showModal()` on an open dialog
       throws and `close()` on a shut one fires a second `close` event.
     *
     * `showModal` when modal and `show` when not, which is the whole of what
     * `modal` means now: both put the panel in the top layer, and only the
     * first brings a backdrop, a focus trap and `inert` behind it. This was a
     * hand-built `position: fixed` panel with a scrim div, a focus trap and a
     * dismisser, none of which the platform needed telling. */
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
    } else if (!this.open && panel.open) {
      panel.close()
    }
  }

  protected override render(): TemplateResult {
    /* No `role`, no `aria-modal`, no `inert`, no `tabindex`: a `<dialog>` opened
       with `showModal()` carries all four, and each hand-written version was a
       thing that could drift from what the element actually did. */
    return html`<dialog
      part="panel"
      aria-label=${this.label || 'Drawer'}
      @cancel=${this.handleCancel}
      @click=${this.handleBackdrop}
      @close=${this.handleClose}
    >
      <div part="header"><slot name="header"></slot></div>
      <div part="content"><slot></slot></div>
    </dialog>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-drawer': HelixBaseDrawer
  }
}
