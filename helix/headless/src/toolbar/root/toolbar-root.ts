import {
  AriaForwardController,
  closestInstance,
  customElement,
  HelixElement,
  inlineStep,
  keyClaimed,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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

/** Elements the browser focuses with no help. */
const NATIVE =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]'

/**
 * The same, inside a child's shadow root, less what is out of the tab order.
 * A menu row renders `tabindex="-1"`, and a menu is reached at its trigger.
 */
const TABBABLE = NATIVE.replace('[tabindex]', '[tabindex]:not([tabindex="-1"])')

/**
 * Whether an element takes focus itself: natively, by owning a tab stop, or
 * through a shadow root that holds something focusable.
 *
 * Disabled and hidden elements do not count, and neither does an element that
 * only holds focusable children in its light DOM. A divider takes none, and a
 * menu's host passes focus to nothing: its trigger is the control.
 */
const takesFocus = (node: Element): boolean => {
  if (
    !(node instanceof HTMLElement) ||
    node.hasAttribute('disabled') ||
    node.getAttribute('aria-hidden') === 'true'
  ) {
    return false
  }
  return (
    node.matches(NATIVE) ||
    ownsTabStop(node) ||
    node.shadowRoot?.delegatesFocus === true ||
    node.shadowRoot?.querySelector(TABBABLE) != null
  )
}

/**
 * A composite whose members the toolbar walks one by one: a toggle group of
 * pressed buttons, whose stop follows focus. A radio group stays one stop,
 * its arrows choosing as they move.
 */
const flattens = (node: HTMLElement): node is HTMLElement & { focusable: boolean } =>
  ownsTabStop(node) &&
  (node as HTMLElement & { selectionMode?: unknown }).selectionMode === 'multiple'

/** What the toolbar moves to for one of its children. */
interface Control {
  /**
   * The child itself, which is what the toolbar holds, or one member of a
   * group the toolbar walks through.
   */
  child: HTMLElement
  /** The group a walked-through member belongs to, which holds its stop. */
  group?: HTMLElement & { focusable: boolean }
  /**
   * The elements inside the child that take focus. One for a control or for a
   * wrapper such as a menu around its trigger, and more than one for a nested
   * composite such as a toggle group, which keeps its own arrow keys across the
   * toolbar's axis.
   */
  stops: HTMLElement[]
}

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * A toolbar holds a mix of controls, such as buttons, toggles, and menus. A
 * button group holds one kind, so the two are separate components.
 *
 * The toolbar is one tab stop, and the arrow keys move between its controls, so
 * three toolbars take three presses of Tab to pass. Any element the browser can
 * focus counts as a control, including your own elements. A child that takes no
 * focus, such as a divider, is skipped. A menu is reached at its trigger.
 *
 * Controls inside a plain wrapper, such as a `Button Group`, are each a stop
 * of the toolbar's own, as React Aria's toolbar flattens a group: the arrows
 * walk through the group's buttons and on past it, and the group takes no tab
 * stop of its own.
 *
 * The arrows wrap from the last control to the first. Set `stop-at-ends` to
 * keep them at the ends, as Radix's `loop` set to false does.
 *
 * A toggle group of pressed buttons, `selection-mode="multiple"`, is walked
 * through the same way, each toggle a stop on the toolbar's axis, as React
 * Aria's toolbar walks its toggle buttons. Another nested composite, such as a
 * radio-style toggle group, is one stop on the toolbar's axis: the toolbar's
 * arrows move past it, and the arrows across the toolbar move inside it. A
 * composite with a `focusable` property, as Toggle Group has, gives up its own
 * tab stop while the toolbar's is elsewhere, so Tab stops once in the
 * toolbar. A composite without one keeps its own tab stop.
 *
 * A toolbar inside another toolbar, a Helix one or the page's own
 * `role="toolbar"`, is a `group` of the outer one, as React Aria's is: the
 * outer toolbar's arrows walk through its controls and on past them, and it
 * takes no keys and no tab stop of its own. A server renders it as a toolbar,
 * having no parent to read, until it upgrades.
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
   *
   * An `aria-label` or `aria-labelledby` on the host names the toolbar too,
   * and wins over this.
   */
  @property()
  label = 'Toolbar'

  /** Carries a host `aria-label` and `aria-labelledby` to the toolbar. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('toolbar'),
  })

  /**
   * Whether the stop has been written onto controls this package does not
   * know, which happens on the first focus. From then on, every move of the
   * stop has to write them too, or the one at `0` can be removed or disabled
   * and leave every other one at `-1`.
   */
  private wroteForeign = false

  /**
   * The direction the arrow keys move focus in.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether the arrow keys stop at the first and the last control. Unset, they
   * wrap around from one end to the other.
   */
  @property({ attribute: 'stop-at-ends', type: Boolean })
  stopAtEnds = false

  private watcher: MutationObserver | undefined

  /**
   * The children that take part in the toolbar, in document order, each with
   * the elements in it that take focus.
   *
   * A test on the element rather than a list of tag names: a toolbar holds
   * anything, including elements this package has never heard of. A child
   * that takes no focus and holds nothing that does is skipped. Client only,
   * there being no tree to walk on the server.
   */
  private get controls(): Control[] {
    const controls: Control[] = []
    for (const child of this.children) {
      if (
        !(child instanceof HTMLElement) ||
        child.hasAttribute('disabled') ||
        child.getAttribute('aria-hidden') === 'true'
      ) {
        continue
      }
      if (takesFocus(child)) {
        const stops = this.inside(child)
        if (stops.length > 1 && flattens(child)) {
          for (const stop of stops) {
            controls.push({ child: stop, group: child, stops: [stop] })
          }
          continue
        }
        controls.push({ child, stops })
        continue
      }
      /* A wrapper that takes no focus, a button group or a menu around its
         trigger: each control in it is a stop of the toolbar's own. */
      for (const stop of this.within(child)) {
        controls.push({ child: stop, stops: [stop] })
      }
    }
    return controls
  }

  /** The elements in a child's light DOM that take focus. */
  private within(child: HTMLElement): HTMLElement[] {
    return [...child.querySelectorAll<HTMLElement>('*')].filter(takesFocus)
  }

  /**
   * The stops of a child that takes focus itself: the child, or the members of
   * a composite that owns its tab stop, such as a toggle group, which the
   * toolbar enters at a member and moves the stop of through `focusable`.
   */
  private inside(child: HTMLElement): HTMLElement[] {
    if (!ownsTabStop(child)) {
      return [child]
    }
    const members = this.within(child)
    return members.length > 1 ? members : [child]
  }

  /**
   * Where focus lands on arriving at a control. A nested composite is entered
   * at the stop it holds, which for a toggle group is the chosen toggle.
   */
  private entry(control: Control): HTMLElement | undefined {
    const { stops } = control
    if (stops.length === 1) {
      return stops[0]
    }
    return (
      stops.find(
        (stop) =>
          (ownsTabStop(stop) && stop.focusable) ||
          (stop as HTMLElement & { selected?: boolean }).selected === true,
      ) ?? stops[0]
    )
  }

  /** The control a press or a focus came from, by its path. */
  private origin(event: Event): Control | undefined {
    const path = event.composedPath()
    return this.controls.find((control) => control.stops.some((stop) => path.includes(stop)))
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
  private setTabStop(active: Control | undefined, foreign = true): void {
    if (foreign) {
      this.wroteForeign = true
    }
    for (const control of this.controls) {
      /* A walked-through group's own roving decides which member holds the
         stop, following focus, so the toolbar only says whether it is the
         group's. */
      if (control.group) {
        control.group.focusable = control.group === active?.group
        continue
      }
      if (control.stops.length !== 1) {
        /* A nested composite that owns its tab stop gives it up while the
           toolbar's is elsewhere. One that does not keeps its own. */
        if (ownsTabStop(control.child)) {
          control.child.focusable = control.child === active?.child
        }
        continue
      }
      const element = control.stops[0] as HTMLElement
      const stop = control.child === active?.child
      if (ownsTabStop(element)) {
        element.focusable = stop
      } else if (foreign || this.wroteForeign) {
        element.tabIndex = stop ? 0 : -1
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
    if (this.nested) {
      return
    }
    const pending = [...new Set([...this.children].map((child) => child.localName))].filter(
      (name) => name.includes('-'),
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
    if (this.nested) {
      return
    }
    const control = this.origin(event)
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
   * `foreign` stays false, the same as the first claim, until a focus has
   * written `tabindex="-1"` onto foreign controls. From then on `setTabStop`
   * writes them as well, so removing or disabling the native button that held
   * the stop hands it to the first one left.
   */
  private readonly restoreTabStop = (): void => {
    if (this.nested) {
      return
    }
    const controls = this.controls
    const held = controls.some((control) => {
      if (control.group) {
        return control.group.focusable
      }
      const composite = control.stops.length !== 1
      const element = composite ? control.child : (control.stops[0] as HTMLElement)
      if (ownsTabStop(element)) {
        return element.focusable
      }
      /* A composite that cannot give up its stop always holds one. */
      return composite || element.tabIndex === 0
    })
    if (controls.length > 0 && !held) {
      this.setTabStop(controls[0], false)
    }
  }

  /**
   * Whether this toolbar sits inside another, which then owns the keys and the
   * tab stop: a toolbar inside a toolbar held the reader's arrows inside it.
   * Read when it renders and when it connects, there being no parent on a
   * server.
   */
  private get nested(): boolean {
    const parent = this.parentElement
    if (!parent) {
      return false
    }
    return (
      closestInstance(parent, HelixHeadlessToolbar) !== null ||
      parent.closest('[role="toolbar"]') !== null
    )
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

  /**
   * The toolbar's own keys, from inside a nested composite.
   *
   * In capture, ahead of the composite, which answers every arrow itself and
   * would otherwise hold the reader inside it. Only the keys along the
   * toolbar's axis and Home and End are taken, so the arrows across it still
   * move inside the composite.
   */
  private readonly handleCompositeKeydown = (event: KeyboardEvent): void => {
    if (this.nested) {
      return
    }
    const control = this.origin(event)
    if (!control || (control.stops.length === 1 && !control.group)) {
      return
    }
    this.handleKeydown(event)
    if (event.defaultPrevented) {
      event.stopPropagation()
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.nested || !KEYS.has(event.key) || keyClaimed(event)) {
      return
    }
    /* Along the line on a horizontal toolbar, so the forward key is the left on
       a right-to-left page, where the first control is on the right. */
    const along = inlineStep(this, event.key)
    const forward = this.axis === 'horizontal' ? along === 1 : event.key === 'ArrowDown'
    const back = this.axis === 'horizontal' ? along === -1 : event.key === 'ArrowUp'

    const controls = this.controls
    const origin = this.origin(event)
    const current = origin ? controls.findIndex((control) => control.child === origin.child) : -1
    if (current === -1) {
      return
    }

    let next = current
    const last = controls.length - 1
    if (forward) {
      next = this.stopAtEnds ? Math.min(current + 1, last) : (current + 1) % controls.length
    } else if (back) {
      next = this.stopAtEnds
        ? Math.max(current - 1, 0)
        : (current - 1 + controls.length) % controls.length
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
    const element = target ? this.entry(target) : undefined
    if (element && 'focusItem' in element && typeof element.focusItem === 'function') {
      element.focusItem()
    } else {
      element?.focus()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Moved into or out of another toolbar, so the role is read again. */
    this.requestUpdate()
    this.addEventListener('keydown', this.handleCompositeKeydown, true)
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
    this.removeEventListener('keydown', this.handleCompositeKeydown, true)
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
    const nested = this.nested
    return html`<div
      part="toolbar"
      role=${nested ? 'group' : 'toolbar'}
      aria-label=${this.label}
      aria-orientation=${nested ? nothing : this.axis}
    >
      <slot @slotchange=${() => this.claimTabStop()}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toolbar': HelixHeadlessToolbar
  }
}
