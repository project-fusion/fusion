import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** Keys the toolbar handles, per the APG toolbar pattern. */
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * Separate from a button group, and the difference is what it holds: a group is
 * homogeneous, a toolbar is not. A toolbar mixes buttons, toggles, and menus,
 * which is why it is its own component rather than a variant of something.
 *
 * The whole toolbar is one tab stop and the arrows move between controls, so a
 * page with three toolbars costs three presses of Tab to get past rather than
 * thirty. Controls are found by asking the browser what is focusable rather
 * than by matching tag names, so a toolbar works with anything put in it,
 * including a consumer's own elements.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Actions, Action bar
 * @documentation https://helix.fusion.dev/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 */
@customElement('helix-base-toolbar')
export class HelixBaseToolbar extends HelixElement {
  /** Accessible name for the toolbar. */
  @property()
  label = 'Toolbar'

  /** Which way the arrow keys move. */
  @property({ reflect: true })
  orientation: 'horizontal' | 'vertical' = 'horizontal'

  /**
   * Focusable controls, in document order.
   *
   * Asks each child for its own focus target rather than matching tag names, so
   * a toolbar holds anything, including elements this package has never heard
   * of. Client only: there is no tree to walk on the server.
   */
  private get controls(): HTMLElement[] {
    return [...this.children].filter((child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) {
        return false
      }
      return !child.hasAttribute('disabled') && child.getAttribute('aria-hidden') !== 'true'
    })
  }

  private setTabStop(active: HTMLElement | undefined): void {
    for (const control of this.controls) {
      control.tabIndex = control === active ? 0 : -1
    }
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const control = this.controls.find((entry) => entry.contains(event.target as Node))
    if (control) {
      this.setTabStop(control)
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const forward = this.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const back = this.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    if (!KEYS.has(event.key)) {
      return
    }

    const controls = this.controls
    const current = controls.findIndex((entry) => entry.contains(event.target as Node))
    if (current === -1) {
      return
    }

    let next = current
    if (event.key === forward) {
      next = (current + 1) % controls.length
    } else if (event.key === back) {
      next = (current - 1 + controls.length) % controls.length
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = controls.length - 1
    } else {
      // An arrow along the other axis is not ours; leave it to the page.
      return
    }

    event.preventDefault()
    const target = controls[next]
    this.setTabStop(target)
    target?.focus()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.handleKeydown)
    this.addEventListener('focusin', this.handleFocusIn)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.setTabStop(this.controls[0])
  }

  protected override render(): TemplateResult {
    return html`<div part="toolbar" role="toolbar" aria-label=${this.label} aria-orientation=${this.orientation}>
      <slot @slotchange=${() => this.setTabStop(this.controls[0])}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toolbar': HelixBaseToolbar
  }
}
