import {
  customElement,
  DismissController,
  FocusTrapController,
  HelixElement,
  WithOpen,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A panel that slides in from an edge.
 *
 * @description
 * Takes `WithOpen`, so `open`, `defaultOpen`, and `OpenChange` behave exactly
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
 * @slot - The drawer's content.
 * @slot header - Content pinned above the scrolling area.
 *
 * @csspart scrim - The cover over the page behind.
 * @csspart panel - The sliding panel.
 * @csspart header - The header region.
 * @csspart content - The scrolling content region.
 *
 * @event {HelixOpenChangeEvent} OpenChange - Fired when the drawer opens or closes.
 */
@customElement('helix-base-drawer')
export class HelixBaseDrawer extends WithOpen(HelixElement) {
  /** Which edge the drawer comes from. */
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

  private readonly trap = new FocusTrapController(this)

  private readonly dismisser = new DismissController(this, {
    // The panel, not the host. The scrim is in this shadow root, so a press on
    // it is inside the host's composed path: measured against the host, the one
    // gesture that most obviously means "close" never closed anything.
    boundary: () => this.renderRoot.querySelector('[part="panel"]'),
    onDismiss: () => {
      if (this.isOpen) {
        this.setOpen(false)
      }
    },
  })

  /** Whether the trap and the dismisser are currently on. */
  private engaged = false

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)

    // Driven by `isOpen` rather than by which property changed. Uncontrolled
    // state does not live on `open` at all, so watching that property meant the
    // trap never engaged for the common case.
    const shouldEngage = this.isOpen && this.modal
    if (shouldEngage === this.engaged) {
      return
    }
    this.engaged = shouldEngage

    const panel = this.renderRoot.querySelector<HTMLElement>('[part="panel"]')
    if (shouldEngage && panel) {
      this.trap.activate(panel)
      this.dismisser.activate()
    } else {
      this.trap.deactivate()
      this.dismisser.deactivate()
    }
  }

  protected override render(): TemplateResult {
    const open = this.isOpen
    return html`<div part="scrim" ?hidden=${!open || !this.modal}></div>
      <div
        part="panel"
        role=${this.modal ? 'dialog' : 'region'}
        aria-modal=${this.modal ? 'true' : 'false'}
        aria-label=${this.label || 'Drawer'}
        ?inert=${!open}
        tabindex="-1"
      >
        <div part="header"><slot name="header"></slot></div>
        <div part="content"><slot></slot></div>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-drawer': HelixBaseDrawer
  }
}
