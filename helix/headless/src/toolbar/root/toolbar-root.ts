import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** Keys the toolbar handles, per the APG toolbar pattern. */
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * A control that owns its tab stop rather than taking one on its host.
 *
 * Checked as a property rather than with `instanceof`, for the same reason the
 * control list is: a toolbar holds anything, so the contract has to be
 * something a foreign element can satisfy.
 */
const ownsTabStop = (node: HTMLElement): node is HTMLElement & { focusable: boolean } =>
  'focusable' in node

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
  orientation?: 'horizontal' | 'vertical'

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

  /**
   * Moves the single tab stop to one control.
   *
   * Prefers the control's own `focusable` property to writing `tabindex` on it.
   * The attribute is a change to markup the consumer rendered, which a React
   * consumer's hydration reports and does not patch up; a control that offers
   * the property moves the stop inside its own shadow root instead.
   *
   * `tabindex` stays as the fallback, because a toolbar has to hold controls
   * this package has never heard of.
   */
  private setTabStop(active: HTMLElement | undefined): void {
    for (const control of this.controls) {
      const stop = control === active
      if (ownsTabStop(control)) {
        control.focusable = stop
      } else {
        control.tabIndex = stop ? 0 : -1
      }
    }
  }

  /**
   * Sets the first tab stop once every custom control has upgraded.
   *
   * A custom element has no properties at all before it upgrades, so a pass
   * that ran first would find no `focusable`, take the `tabindex` fallback, and
   * write the very attribute this exists to avoid.
   */
  private async claimTabStop(): Promise<void> {
    const pending = [...new Set(this.controls.map((control) => control.localName))].filter((name) =>
      name.includes('-'),
    )
    await Promise.all(pending.map((name) => customElements.whenDefined(name)))
    this.setTabStop(this.controls[0])
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const control = this.controls.find((entry) => entry.contains(event.target as Node))
    if (control) {
      this.setTabStop(control)
    }
  }

  /**
   * The orientation in force.
   *
   * Unset is horizontal, and stays unset: the default is the absent attribute,
   * so a reflected default cannot appear on the host after hydration.
   */
  private get axis(): 'horizontal' | 'vertical' {
    return this.orientation ?? 'horizontal'
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const forward = this.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const back = this.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
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
    void this.claimTabStop()
  }

  protected override render(): TemplateResult {
    return html`<div part="toolbar" role="toolbar" aria-label=${this.label} aria-orientation=${this.axis}>
      <slot @slotchange=${() => this.claimTabStop()}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toolbar': HelixBaseToolbar
  }
}
