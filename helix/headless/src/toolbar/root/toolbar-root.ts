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
 * Input types with no text to move a caret through and no value an arrow moves.
 *
 * Everything else claims the arrows for itself: a caret in a text field, a
 * spinner on `number`, a value on `range`, a group on `radio`.
 */
const CARETLESS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'reset', 'submit'])

/**
 * Whether the press was already the business of whatever it landed on.
 *
 * A toolbar holds anything, and some of what it holds uses the arrow keys for
 * itself. The handler below found the control the press came from and moved the
 * toolbar regardless, so an input in a toolbar could not be edited: pressing
 * ArrowRight to move the caret moved the focus to the next control instead, and
 * `preventDefault` meant the caret never moved at all.
 *
 * `composedPath()[0]` rather than `event.target`, which is retargeted to the
 * control's host at the shadow boundary and cannot tell a text field inside a
 * component from the component itself.
 *
 * `defaultPrevented` first, because a control that has already answered the
 * press has said so in the way the platform provides, and a foreign control
 * this package has never heard of has no other way to say it.
 */
const claimed = (event: KeyboardEvent): boolean => {
  if (event.defaultPrevented) {
    return true
  }
  const inner = event.composedPath()[0]
  if (!(inner instanceof HTMLElement)) {
    return false
  }
  if (inner.isContentEditable || inner.localName === 'textarea' || inner.localName === 'select') {
    return true
  }
  return inner.localName === 'input' && !CARETLESS.has((inner as HTMLInputElement).type)
}

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
 * @documentation https://helix.fusion.dev/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 */
@customElement('helix-headless-toolbar')
export class HelixHeadlessToolbar extends HelixElement {
  /**
   * Accessible name for the toolbar.
   */
  @property()
  label = 'Toolbar'

  /**
   * Which way the arrow keys move.
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
   * **It does not ask a child whether it is focusable, and the description said
   * it did.** That would mean reading a `focusable` property off each one, which
   * `focus` below does when moving the stop and this does not when choosing the
   * set. The two are separable and only one of them was ever written: an element
   * that is neither disabled nor hidden and still cannot take focus is counted
   * here and skipped there.
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
   * holding the stop dropped it out of the list while every other control was
   * already at `-1`. The toolbar then had no tab stop at all and the keyboard
   * could not reach it again, from a change as ordinary as a Save button
   * disabling itself once the form is clean.
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
    const forward = this.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const back = this.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    if (!KEYS.has(event.key) || claimed(event)) {
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
