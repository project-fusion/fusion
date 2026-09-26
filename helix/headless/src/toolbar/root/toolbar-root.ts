import { customElement, HelixElement, inlineStep, keyClaimed } from '@fusion.dev/helix-core'
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
 * @status stable
 * @category layout
 * @aliases Actions, Action bar
 * @documentation https://fusion.dev/helix/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 */
@customElement('helix-headless-toolbar')
export class HelixHeadlessToolbar extends HelixElement {
  /**
   * The toolbar's name, read by screen readers.
   */
  @property()
  label = 'Toolbar'

  /**
   * The direction the arrow keys move focus in.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  private watcher: MutationObserver | undefined

  /**
   * Children that can take the tab stop, in document order.
   *
   * Every child that is not `disabled` and not `aria-hidden`, which is
   * deliberately a test on the element rather than a list of tag names: a
   * toolbar holds anything, including elements this package has never heard of.
   * Client only, there being no tree to walk on the server.
   *
   * **It does not ask a child whether it is focusable.** Reading a `focusable`
   * property is what `setTabStop` does when moving the stop, not what this does
   * when choosing the set, so an element that is neither disabled nor hidden and
   * still cannot take focus is counted here and skipped there.
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
  private setTabStop(active: HTMLElement | undefined, foreign = true): void {
    for (const control of this.controls) {
      const stop = control === active
      if (ownsTabStop(control)) {
        control.focusable = stop
      } else if (foreign) {
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
    // Foreign controls are left alone until focus arrives. Writing `tabindex`
    // on one before any interaction changes markup the consumer rendered while
    // React is still hydrating it, which it reports and does not patch up.
    // Until then they keep the tab order the document already gave them, and
    // the first `focusin` takes over from there.
    this.setTabStop(this.controls[0], false)
  }

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const control = this.controls.find((entry) => entry.contains(event.target as Node))
    if (control) {
      this.setTabStop(control)
    }
  }

  /**
   * Gives the tab stop back to a control that still exists.
   *
   * `controls` excludes anything disabled or hidden, so disabling the control
   * holding the stop drops it out of the list while every other control is
   * already at `-1`, leaving a toolbar the keyboard cannot reach at all. A Save
   * button disabling itself once the form is clean is enough to do it.
   *
   * `foreign` stays false, the same as the first claim: a control this package
   * has never heard of that was never given `tabindex="-1"` is still in the
   * document's own tab order, so it is never the one that gets stranded.
   */
  private readonly restoreTabStop = (): void => {
    const controls = this.controls
    const held = controls.some((control) =>
      ownsTabStop(control) ? control.focusable : control.tabIndex === 0,
    )
    if (controls.length > 0 && !held) {
      this.setTabStop(controls[0], false)
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
    if (!KEYS.has(event.key) || keyClaimed(event)) {
      return
    }
    /* Along the line on a horizontal toolbar, so the forward key is the left on
       a right-to-left page, where the first control is on the right. */
    const along = inlineStep(this, event.key)
    const forward = this.axis === 'horizontal' ? along === 1 : event.key === 'ArrowDown'
    const back = this.axis === 'horizontal' ? along === -1 : event.key === 'ArrowUp'

    const controls = this.controls
    const current = controls.findIndex((entry) => entry.contains(event.target as Node))
    if (current === -1) {
      return
    }

    let next = current
    if (forward) {
      next = (current + 1) % controls.length
    } else if (back) {
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
    /* `disabled` and `aria-hidden` are what `controls` filters on, so a change
       to either is a change to the set the stop has to live in. Nothing else is
       watched, which also keeps `setTabStop` writing `tabindex` from feeding
       back into this. */
    this.watcher = new MutationObserver(this.restoreTabStop)
    this.watcher.observe(this, {
      attributeFilter: ['disabled', 'aria-hidden'],
      attributes: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.handleKeydown)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.watcher?.disconnect()
    this.watcher = undefined
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
    'helix-headless-toolbar': HelixHeadlessToolbar
  }
}
