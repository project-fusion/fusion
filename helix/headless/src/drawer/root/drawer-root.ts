import {
  CommandController,
  customElement,
  HelixElement,
  MixinControllerOpen,
  onUnlessFalse,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * Takes `MixinControllerOpen`, so `open`, `defaultOpen` and the
 * `helix-before-open` and `helix-before-close` requests behave exactly as they
 * do on an accordion item, and a consumer already knows the API.
 *
 * Modal by default, which is three things together and not one: focus is
 * trapped inside, Escape and an outside press close it, and the page behind is
 * covered. A panel with the look of a modal and none of its behavior is worse
 * than an inline one, because it invites the reader to treat it as blocking.
 *
 * Content stays mounted when closed, so it is in the server's markup and can
 * animate. A closed `<dialog>` is already out of the tab order and out of the
 * accessibility tree, so nothing here writes `inert`. The `role`, the
 * `aria-modal` and the scrim come from the element too, and
 * `drawer-root.ssr.spec.ts` asserts the panel carries no hand-written `inert`
 * and no hand-written `role`.
 *
 * Opened declaratively with the platform's invoker attributes:
 *
 * ```html
 * <helix-button commandfor="nav" command="--toggle">Menu</helix-button>
 * <helix-drawer id="nav">…</helix-drawer>
 * ```
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @aliases Sheet, Sidebar, Panel, Off-canvas
 * @documentation https://helix.fusion.dev/components/drawer
 *
 * @slot - The drawer's content.
 * @slot header - Content pinned above the scrolling area.
 *
 * @event {Event} close - Relayed, because the platform's own does not escape.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the panel closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the panel opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart content - The scrolling content region.
 * @csspart header - The header region.
 * @csspart panel - The sliding panel.
 */
@customElement('helix-headless-drawer')
export class HelixHeadlessDrawer extends MixinControllerOpen(HelixElement) {
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
   * Which close requests the browser answers on its own.
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
   * Accessible name for the panel.
   */
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
  @property({ converter: onUnlessFalse })
  modal = true

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
      closedby=${this.closedBy ?? nothing}
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
    'helix-headless-drawer': HelixHeadlessDrawer
  }
}
