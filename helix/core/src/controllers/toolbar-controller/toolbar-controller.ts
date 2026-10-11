import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
import { keyClaimed } from '../../utils/key-claimed/key-claimed.js'
import { Typeahead, typesCharacter } from '../../utils/typeahead/typeahead.js'

/** Keys a toolbar handles, per the APG toolbar pattern. */
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
 * The control inside a custom element that its tab stop was written on, by
 * host. Remembered, because `tabindex="-1"` takes an element that is focusable
 * only by its `tabindex` out of `TABBABLE`, and the host would then look like
 * no control at all.
 */
const innerStops = new WeakMap<HTMLElement, HTMLElement>()

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
    node.shadowRoot?.querySelector(TABBABLE) != null ||
    innerStops.get(node)?.isConnected === true
  )
}

/**
 * Where the tab stop of a control that offers no `focusable` is written.
 *
 * A custom element's own control, inside its open shadow root, where one is
 * there to find: the host is markup the consumer rendered, and an attribute
 * written on it is one a React consumer's hydration reports and does not patch
 * up. A native element, a host that already has a `tabindex`, or a host whose
 * shadow root is closed or holds nothing the browser tabs to takes it on
 * itself.
 */
const stopOf = (node: HTMLElement): HTMLElement => {
  if (node.hasAttribute('tabindex')) {
    return node
  }
  const held = innerStops.get(node)
  if (held?.isConnected && held.getRootNode() === node.shadowRoot) {
    return held
  }
  const inner = node.localName.includes('-')
    ? node.shadowRoot?.querySelector<HTMLElement>(TABBABLE)
    : null
  if (!inner) {
    return node
  }
  innerStops.set(node, inner)
  return inner
}

/**
 * Writes `tabindex` only where it changes, so a stop kept across every render
 * of a host that draws its own controls costs a read per control.
 */
const writeStop = (element: HTMLElement, stop: boolean): void => {
  const value = stop ? '0' : '-1'
  if (element.getAttribute('tabindex') !== value) {
    element.setAttribute('tabindex', value)
  }
}

/**
 * A composite whose members the toolbar walks one by one: a toggle group of
 * pressed buttons, whose stop follows focus. A radio group stays one stop,
 * its arrows choosing as they move.
 */
const flattens = (node: HTMLElement): node is HTMLElement & { focusable: boolean } =>
  ownsTabStop(node) &&
  (node as HTMLElement & { selectionMode?: unknown }).selectionMode === 'multiple'

/** What the toolbar moves to for one of its members. */
interface Control {
  /**
   * The member itself, which is what the toolbar holds, or one member of a
   * group the toolbar walks through.
   */
  child: HTMLElement
  /** The group a walked-through member belongs to, which holds its stop. */
  group?: HTMLElement & { focusable: boolean }
  /**
   * The elements inside the member that take focus. One for a control or for a
   * wrapper such as a menu around its trigger, and more than one for a nested
   * composite such as a toggle group, which keeps its own arrow keys across the
   * toolbar's axis.
   */
  stops: HTMLElement[]
}

/** What a toolbar tells the controller about itself. */
export interface ToolbarControllerOptions {
  /**
   * The toolbar's members, in order, read fresh on each pass: the `Toolbar`
   * element's children, or the controls a component draws in its own shadow
   * root. A `<slot>` among them is read as the elements assigned to it.
   */
  members: () => Element[]
  /** Whether another toolbar around this one owns the keys and the tab stop. Unset, none does. */
  nested?: () => boolean
  /**
   * How the arrow keys move between the controls. Unset, horizontal.
   *
   * - `horizontal`: Left and Right, in order, the left moving forward on a
   *   right-to-left page. Up and Down are left to the control.
   * - `vertical`: Up and Down, in order. Left and Right are left to the control.
   * - `both`: Right and Down forward, Left and Up back, in order, for a row
   *   that wraps onto more lines, as a legend's does.
   * - `position`: each arrow to the nearest control that way on screen, for
   *   a cluster laid out in two dimensions, such as a pan pad. It stops at
   *   the edge rather than wrapping, and where nothing is laid out it moves
   *   in order, as `both` does.
   */
  arrows?: () => 'both' | 'horizontal' | 'position' | 'vertical' | undefined
  /**
   * Whether the controls are the host's own, drawn in its shadow root, rather
   * than markup a page wrote. Its own controls take the tab stop as soon as
   * they render and keep it across renders. A page's are left as they are
   * until focus first arrives, since a `tabindex` written while React hydrates
   * them is one it reports and does not patch up.
   */
  own?: boolean
  /** Whether the arrow keys stop at the first and the last control. Unset, they wrap. */
  stopAtEnds?: () => boolean
  /**
   * The words a control is found by when a reader types its first letters,
   * the way a native `<select>` finds an option. Unset, typing moves nothing.
   */
  words?: (control: HTMLElement) => string
  /**
   * Where a change to `disabled` or `aria-hidden` is watched for, which is
   * what moves the stop off a control that leaves the set. The host by
   * default, whose light DOM a page's toolbar holds; the render root for
   * controls the host draws itself.
   */
  watch?: () => Node | null | undefined
}

/**
 * Makes a row of controls one tab stop that the arrow keys move along, the
 * APG toolbar pattern: what `Toolbar` does for its children, for any host.
 *
 * **One implementation for every toolbar in the library.** `Toolbar` runs on
 * it over the controls a page writes, and a component that draws its own row
 * of buttons, such as a canvas's pan and zoom pad, runs on it over those, so
 * the two agree on every key, on how the stop moves through a control's
 * `focusable` or its `tabindex`, and on what happens when the control holding
 * the stop is disabled or removed. Before it, two families rebuilt the
 * pattern by hand and three drew a tab stop per button.
 *
 * The host names the role and the label on the element that holds the
 * controls, `role="toolbar"` with `aria-orientation`, since only it knows
 * which element that is:
 *
 *     protected readonly controlKeys = new ToolbarController(this, {
 *       members: () => [...(this.partNamed('controls')?.children ?? [])],
 *       arrows: () => 'position',
 *       own: true,
 *       watch: () => this.renderRoot,
 *     })
 *
 * **Keys and focus are heard on the host**, where a press on a control in its
 * shadow root or in its light DOM arrives either way, and only a press that
 * starts on a control is taken: a host's own arrow keys on anything else, such
 * as a board's panning, are left alone.
 *
 * A page's toolbar claims its first stop once every custom control in it has
 * upgraded, by `claim()`, which `Toolbar` calls after its first render and on
 * every `slotchange`. A host's own controls are kept after every update: the
 * control that held the stop keeps it, and one that left hands it to the
 * first.
 */
export class ToolbarController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly options: ToolbarControllerOptions

  /** The member that last held the stop, which a host's own controls keep across renders. */
  private active: HTMLElement | undefined

  /**
   * Whether the stop has been written onto controls this package does not
   * know, which happens on the first focus. From then on, every move of the
   * stop has to write them too, or the one at `0` can be removed or disabled
   * and leave every other one at `-1`.
   */
  private wroteForeign = false

  private watcher: MutationObserver | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: ToolbarControllerOptions) {
    this.host = host
    this.options = options
    this.wroteForeign = options.own === true
    host.addController(this)
  }

  /** The members, a slot among them read as the elements assigned to it. */
  get members(): Element[] {
    return this.options
      .members()
      .flatMap((child) =>
        child instanceof HTMLSlotElement ? child.assignedElements({ flatten: true }) : [child],
      )
  }

  private get nested(): boolean {
    return this.options.nested?.() ?? false
  }

  private get arrows(): 'both' | 'horizontal' | 'position' | 'vertical' {
    return this.options.arrows?.() ?? 'horizontal'
  }

  /** The letters a reader has typed toward a control, where `words` is set. */
  private readonly search = new Typeahead()

  /**
   * The members that take part, in order, each with the elements in it that
   * take focus.
   *
   * A test on the element rather than a list of tag names: a toolbar holds
   * anything, including elements this package has never heard of. A member
   * that takes no focus and holds nothing that does is skipped. Client only,
   * there being no tree to walk on the server.
   */
  private get controls(): Control[] {
    const controls: Control[] = []
    for (const child of this.members) {
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

  /** The elements in a member's light DOM that take focus. */
  private within(child: HTMLElement): HTMLElement[] {
    return [...child.querySelectorAll<HTMLElement>('*')].filter(takesFocus)
  }

  /**
   * The stops of a member that takes focus itself: the member, or the members
   * of a composite that owns its tab stop, such as a toggle group, which the
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
    this.active = active?.group ?? active?.child
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
        if (element.focusable !== stop) {
          element.focusable = stop
        }
      } else if (foreign || this.wroteForeign) {
        writeStop(stopOf(element), stop)
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
  async claim(): Promise<void> {
    if (this.nested) {
      return
    }
    await this.upgraded()
    // Foreign controls are left alone until focus arrives. Writing `tabindex`
    // on one before any interaction changes markup the consumer rendered while
    // React is still hydrating it, which it reports and does not patch up.
    // Until then they keep the tab order the document already gave them, and
    // the first `focusin` takes over from there.
    this.setTabStop(this.controls[0], false)
  }

  /** Waits for every custom element among the members to be defined. */
  private async upgraded(): Promise<void> {
    const pending = [...new Set(this.members.map((child) => child.localName))].filter(
      (name) => name.includes('-') && customElements.get(name) === undefined,
    )
    await Promise.all(pending.map((name) => customElements.whenDefined(name)))
  }

  /**
   * Keeps the stop on a host's own controls after a render: on the control
   * that held it, or on the first where that one left. Idempotent, so a render
   * that changed nothing writes nothing.
   */
  private async keep(): Promise<void> {
    if (this.nested) {
      return
    }
    await this.upgraded()
    const controls = this.controls
    const held = controls.find(
      (control) => control.child === this.active || control.group === this.active,
    )
    this.setTabStop(held ?? controls[0])
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
  restore(): void {
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
      return composite || stopOf(element).tabIndex === 0
    })
    if (controls.length > 0 && !held) {
      this.setTabStop(controls[0], false)
    }
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

  /**
   * The control a typed letter moves to, by the words `words` reads, or
   * undefined where nothing matches or the press is no letter. A Space typed
   * before any letter is left to the control, which it presses.
   */
  private typed(event: KeyboardEvent, controls: Control[], current: number): number | undefined {
    const words = this.options.words
    if (!words || !typesCharacter(event) || (event.key === ' ' && !this.search.typing())) {
      return undefined
    }
    const found = this.search.match(
      event.key,
      controls.map((control) => words(control.child)),
      current,
    )
    return found === -1 ? undefined : found
  }

  /**
   * The nearest control in an arrow's direction on screen, from the centers of
   * the boxes: the distance along the arrow, with twice the distance across it
   * added, so a control in line wins over a nearer one off to the side. `-1`
   * where nothing lies that way, and undefined where nothing is laid out.
   */
  private toward(key: string, controls: Control[], current: number): number | undefined {
    const boxes = controls.map((control) => control.child.getBoundingClientRect())
    if (boxes.every((box) => box.width === 0 && box.height === 0)) {
      return undefined
    }
    const from = boxes[current] as DOMRect
    const [x, y] = [from.left + from.width / 2, from.top + from.height / 2]
    const [dx, dy] = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    }[key] as [number, number]
    let best = -1
    let score = Number.POSITIVE_INFINITY
    boxes.forEach((box, index) => {
      if (index === current) {
        return
      }
      const along = (box.left + box.width / 2 - x) * dx + (box.top + box.height / 2 - y) * dy
      const across = Math.abs(
        (box.left + box.width / 2 - x) * dy + (box.top + box.height / 2 - y) * dx,
      )
      if (along <= 1) {
        return
      }
      if (along + across * 2 < score) {
        score = along + across * 2
        best = index
      }
    })
    return best
  }

  /** Where an arrow key moves in order, forward or back, or undefined for one this toolbar leaves alone. */
  private stepped(event: KeyboardEvent, controls: Control[], current: number): number | undefined {
    const arrows = this.arrows
    /* Along the line on a horizontal toolbar, so the forward key is the left on
       a right-to-left page, where the first control is on the right. */
    const along = inlineStep(this.host, event.key)
    const down = event.key === 'ArrowDown'
    const up = event.key === 'ArrowUp'
    const forward =
      arrows === 'vertical' ? down : arrows === 'horizontal' ? along === 1 : along === 1 || down
    const back =
      arrows === 'vertical' ? up : arrows === 'horizontal' ? along === -1 : along === -1 || up
    const last = controls.length - 1
    const stopAtEnds = this.options.stopAtEnds?.() ?? false
    if (forward) {
      return stopAtEnds ? Math.min(current + 1, last) : (current + 1) % controls.length
    }
    if (back) {
      return stopAtEnds
        ? Math.max(current - 1, 0)
        : (current - 1 + controls.length) % controls.length
    }
    return undefined
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.nested || keyClaimed(event)) {
      return
    }
    const controls = this.controls
    const origin = this.origin(event)
    const current = origin ? controls.findIndex((control) => control.child === origin.child) : -1
    if (current === -1) {
      return
    }
    /* An arrow with a modifier is someone else's shortcut: Shift with an arrow
       rotates a map from its controls, and selects text in a field. */
    if (KEYS.has(event.key) && (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey)) {
      return
    }
    let next: number | undefined
    if (!KEYS.has(event.key)) {
      next = this.typed(event, controls, current)
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = controls.length - 1
    } else if (this.arrows === 'position') {
      const toward = this.toward(event.key, controls, current)
      next = toward === undefined ? this.stepped(event, controls, current) : toward
      if (next === -1) {
        /* Nothing lies that way: the arrow is still the toolbar's, and the
           page does not scroll under it. */
        event.preventDefault()
        return
      }
    } else {
      // An arrow along the other axis is not ours; leave it to the page.
      next = this.stepped(event, controls, current)
    }
    if (next === undefined) {
      return
    }

    event.preventDefault()
    const target = controls[next]
    this.setTabStop(target)
    const element = target ? this.entry(target) : undefined
    if (element && 'focusItem' in element && typeof element.focusItem === 'function') {
      element.focusItem()
    } else if (element) {
      /* The element the stop was written on, which for a custom element is
         its own control: its host takes no focus without a `tabindex`. */
      ;(ownsTabStop(element) ? element : stopOf(element)).focus()
    }
  }

  hostConnected(): void {
    this.host.addEventListener('keydown', this.handleCompositeKeydown, true)
    this.host.addEventListener('keydown', this.handleKeydown)
    this.host.addEventListener('focusin', this.handleFocusIn)
    /* `disabled` and `aria-hidden` are what `controls` filters on, so a change
       to either is a change to the set the stop has to live in. Nothing else is
       watched, which also keeps `setTabStop` writing `tabindex` from feeding
       back into this. */
    const watched = this.options.watch?.() ?? this.host
    this.watcher = new MutationObserver(() => this.restore())
    this.watcher.observe(watched, {
      attributeFilter: ['disabled', 'aria-hidden'],
      attributes: true,
      subtree: true,
    })
  }

  hostDisconnected(): void {
    this.host.removeEventListener('keydown', this.handleCompositeKeydown, true)
    this.host.removeEventListener('keydown', this.handleKeydown)
    this.host.removeEventListener('focusin', this.handleFocusIn)
    this.watcher?.disconnect()
    this.watcher = undefined
  }

  hostUpdated(): void {
    if (this.options.own) {
      void this.keep()
    }
  }
}
