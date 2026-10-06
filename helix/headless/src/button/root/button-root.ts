import {
  AriaForwardController,
  customElement,
  defaultButton,
  drawStatus,
  elementById,
  HelixFallbackCommandEvent,
  HelixFormElement,
  HelixPressEvent,
  pressType,
  type RecentPress,
  StatusController,
  submitsOnEnter,
  supportsInvokers,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { submitAs } from '../submitter.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Renders a real `<button>`, so activation, focus, and other browser behavior
 * come from the platform.
 *
 * **It never renders an anchor.** A router renders its own `<a>` to intercept a
 * click, and it cannot render one inside the button's shadow root. For a link
 * that looks like a button, use the base layer recipe on your own anchor:
 * `<Link data-button="solid">` draws the same control.
 *
 * `delegatesFocus` moves focus to the inner control. It is serialized into the
 * server markup, so the button is reachable by keyboard before any JavaScript
 * loads.
 *
 * The inner control is always `type="button"`, because a
 * `<button type="submit">` inside a shadow root cannot submit a form outside
 * it. To submit, the button puts a hidden native submit button carrying its
 * `name`, `value` and `form*` overrides into the form, calls
 * `requestSubmit()` with it, which runs validation, unlike `submit()`, and
 * takes it out again, as Shoelace and Web Awesome do. A `submit` listener
 * reads that button as `event.submitter`, so `event.submitter.value` and
 * `new FormData(form, event.submitter)` tell two submit buttons apart.
 *
 * As the first submit button in its form, it is the form's default button:
 * Enter in a text field of the form presses it, as it presses a native one.
 *
 * Set `pending` while the action a press started is still running. The button
 * keeps focus and refuses presses, and a reader on it hears `pending-label`.
 *
 * Every press that acts sends `helix-press` with what pressed it in
 * `detail.pointerType`: `mouse`, `pen`, `touch`, `keyboard`, or `virtual` for
 * a screen reader's press or a script's `click()`, as React Aria's `onPress`
 * does. It is sent once the press has done its own work, before `click`
 * reaches listeners on the element, and never for a disabled or pending
 * button.
 *
 * **Keyboard.** Enter and Space press the button, as on a native one.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @documentation https://fusion.dev/helix/components/button
 *
 * @slot - The button's label.
 * @slot end - Content after the label.
 * @slot start - Content before the label, usually an icon.
 *
 * @event {HelixPressEvent} helix-press - Fired when a press acts, with `detail.pointerType` saying what pressed the button.
 *
 * @csspart button - The inner control.
 * @csspart live - The live region that says `pending-label` when the button becomes pending under focus. It is rendered from the first time the button is pending, and the styled button clips it out of view.
 * @csspart text - The button's words, which the styled button trims to their capitals and baseline so the letters sit at the middle in any font.
 *
 * @cssstate pending - The button is pending: `pending` is set.
 */
@customElement('helix-headless-button')
export class HelixHeadlessButton extends HelixFormElement {
  /* A consumer's `aria-describedby` names ids in their tree and this control is
     in a shadow root, so the reference has to be carried down as an element
     rather than copied as an id. See the controller: measured, the host held
     the description and the accessibility tree exposed the inner control
     without it. */
  protected readonly aria = new AriaForwardController(this, {
    label: () => this.forwardsLabel,
    target: () => this.partNamed('button'),
    unnamed: 'Give it words, a `label`, or an `aria-label`.',
  })

  /**
   * @internal Whether a host `aria-label` names the inner button. A subclass
   * that writes the name itself, as `CopyButton` does while it confirms a
   * copy, says no.
   */
  protected get forwardsLabel(): boolean {
    return true
  }

  /**
   * What to send when the button is activated, and what to send it to.
   *
   * The platform's invoker attributes, forwarded onto the inner `<button>`
   * rather than left on the host: only a real button is recognized as an
   * invoker, so `commandfor` written on a custom element resolves nothing and
   * the trigger silently does nothing at all. A wrapper has to hand them down,
   * the same way `label` becomes `aria-label` in there.
   *
   * ```html
   * <helix-headless-button commandfor="confirm" command="--show">Delete…</helix-headless-button>
   * ```
   *
   * `commandFor` spells its attribute out, because Lit lowercases a property
   * name to derive one rather than dash-casing it, and what a consumer writes
   * is the platform's `commandfor`.
   *
   * @reference https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command Invoker Commands
   */
  @property()
  command = ''

  /**
   * The id of the element the command is sent to.
   *
   * @reference https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-commandfor Invoker Commands
   */
  @property({ attribute: 'commandfor' })
  commandFor = ''

  /**
   * Whether this button is a disclosure trigger, and whether its panel is open.
   *
   * **Set by whatever owns the panel, and a property rather than an attribute
   * for the reason `Menu` already states about its items**: an attribute
   * written onto a consumer's element after it upgrades is a hydration mismatch
   * waiting to happen. Measured 28 Aug 2026 against React 19.2.8, server markup
   * hydrated with the definitions loaded either side of `hydrateRoot`:
   * `Megamenu` and `SpeedDial` wrote `aria-expanded` onto the slotted trigger
   * and React reported "some attributes of the server rendered HTML didn't
   * match the client properties. This won't be patched up" in both orders;
   * `Popover` and `Menu`, which write nothing, were clean in both.
   *
   * **A property crosses that gap because React never looks at one.** It diffs
   * the attributes it rendered, and this one is `attribute: false`, so the state
   * travels to the inner `<button>` and lands inside a shadow root React does
   * not own and cannot compare. The consumer's own element is left exactly as
   * they served it and the reader is still told what the control does.
   *
   * `undefined` renders nothing at all, so a button that is not a trigger
   * carries no `aria-expanded`: the resting state is the attribute's absence,
   * which is the rule every reflected property here follows.
   *
   * A consumer who wants to say this statically writes `aria-expanded` on the
   * host instead, which `AriaForwardController` carries to the same place.
   */
  @property({ attribute: false })
  expanded?: boolean

  /**
   * Whether the button holds its group's tab stop.
   *
   * A toolbar keeps one tab stop across its children, and the obvious way to do
   * that is to write `tabindex` onto each of them. That is a change to markup
   * the consumer rendered, so a React consumer's hydration reports it and does
   * not patch it up. A parent sets this property instead, which writes nothing,
   * and the stop lands on the inner control inside the shadow root.
   *
   * No attribute, because it is coordination between elements rather than
   * anything a consumer sets.
   */
  @property({ attribute: false })
  focusable = true

  /**
   * Where this button's submission goes, overriding the form's own.
   *
   * **The five `form*` overrides ride on a native submit button that stands in
   * for this one**, because `requestSubmit(submitter)` refuses the inner
   * `<button>` twice over: it is `type="button"`, and it sits in this shadow
   * root, so its form owner is not the consumer's form. The stand-in is a
   * hidden `<button type="submit">` in the form for the one synchronous call,
   * so the platform applies the overrides to that submission alone and leaves
   * the form as it was. See `submitAs`.
   */
  @property({ attribute: 'formaction' })
  formAction = ''

  /**
   * How the submission is encoded, overriding the form's own.
   */
  @property({ attribute: 'formenctype' })
  formEnctype = ''

  /**
   * Which HTTP method the submission uses, overriding the form's own.
   */
  @property({ attribute: 'formmethod' })
  formMethod = ''

  /**
   * Whether this submission skips the form's validation.
   */
  @property({ attribute: 'formnovalidate', type: Boolean })
  formNoValidate = false

  /**
   * Which browsing context the response lands in, overriding the form's own.
   */
  @property({ attribute: 'formtarget' })
  formTarget = ''

  /**
   * The button's name, read by screen readers, for a button whose content is
   * not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   */
  @property()
  label = ''

  /**
   * Whether the action the button started is still running.
   *
   * A pending button keeps focus and stays in the tab order, and refuses every
   * press: a click, Enter and Space, and Enter in a field of its form. The
   * click does not reach your listeners. The inner control carries
   * `aria-busy` and `aria-disabled`, and when the button becomes pending while
   * it has focus, a reader hears `pending-label`. The styled button draws a
   * turning ring over its words.
   *
   * `disabled` takes the button out of reach. Use `pending` for the wait after
   * a press, so focus stays where the reader left it.
   */
  @property({ type: Boolean })
  pending = false

  /**
   * What a reader hears when the button becomes pending while it has focus.
   */
  @property({ attribute: 'pending-label' })
  pendingLabel = 'Loading'

  /**
   * What kind of panel this button opens, where it opens one: `menu` for a
   * `Menu`.
   *
   * Set by the component that owns the panel, as a property for the reason
   * `expanded` gives above. It is what makes a reader say the button opens a
   * menu. Read from Chromium's tree, a Menu's trigger was a plain button that
   * reported collapsed and expanded and no popup.
   */
  @property({ attribute: false })
  popup?: 'dialog' | 'grid' | 'listbox' | 'menu' | 'tree'

  /**
   * The status region, rendered from the first time the button is pending, so
   * a button that never waits carries no live region.
   */
  private readonly status = new StatusController(this)

  /**
   * Says `pendingLabel` when the button becomes pending under focus, and
   * clears it when the wait ends.
   *
   * **Only under focus**, as React Aria announces it: the reader who pressed
   * the button is the one waiting, and a button elsewhere on the page that
   * starts waiting is not news to them. The region arrives empty and takes its
   * words a frame later, since a region that arrives with its words is read
   * inconsistently.
   */
  private sayPending(): void {
    const focused = (this.renderRoot as ShadowRoot | undefined)?.activeElement != null
    if (!focused && this.status.said === '') {
      return
    }
    this.status.say(this.pending && focused ? this.pendingLabel : '', { clear: false })
  }

  /**
   * @internal The live region a pending button speaks in, for a subclass that
   * replaces the template, as `CopyButton` does.
   */
  protected renderLive(): TemplateResult | typeof nothing {
    return drawStatus(this.status)
  }

  /** Moves focus to the inner control, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /** What the control saw before a click that the click may not carry. */
  private recent: RecentPress = {}

  /**
   * @internal Records what starts a press, a pointer's kind or Enter or Space,
   * for `helix-press`. Bound on the inner control by this render and by any
   * subclass that draws its own.
   */
  protected readonly notePress = (event: Event): void => {
    if (event.type === 'pointerdown') {
      this.recent = { pointer: (event as PointerEvent).pointerType }
    } else if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
      this.recent = { key: true }
    }
  }

  /**
   * @internal Sends `helix-press` for a click that acted, with what pressed it,
   * and forgets what started it.
   */
  protected announcePress(click: Event): void {
    const pointerType = pressType(click as MouseEvent, this.recent)
    this.recent = {}
    this.dispatchEvent(new HelixPressEvent({ pointerType }))
  }

  private readonly handleClick = (event: Event): void => {
    /* **Refused before anything else, and kept from the page.** A native
       disabled button sends no click at all. A pending one has to stay
       focusable, so the click is stopped here, at the control, before it
       reaches a listener on the host, and its default is prevented so an
       invoker command does not run either. */
    if (this.pending) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    this.act()
    this.announcePress(event)
  }

  /** What a press does: sends the command, and submits or resets the form. */
  private act(): void {
    /* **Re-linked here, and this is the line that makes a trigger reliable.**
     *
     * From `updated` alone the target resolves once, whenever the button last
     * rendered, and never again. A button whose properties do not change does
     * not update again, so one whose target had not been inserted yet stays
     * wired to nothing for good. Measured: `commandForElement` read null with
     * the target absent, null again after the target was inserted, and resolved
     * the instant an unrelated property forced an update. Whether a trigger
     * works then comes down to insertion order, which is why it survives a full
     * reload and not a client navigation, where the same markup arrives in
     * pieces.
     *
     * `sendCommand` resolves through `commandTarget` at activation, so a browser
     * *without* invokers was never affected and one with them was.
     *
     * A click listener is early enough, and that is measured rather than read
     * off the specification: activation behavior runs after the click has
     * finished dispatching, so a handler that assigns `commandForElement` sets
     * it before the browser looks. Probed on a bare `<button command>` whose
     * target was assigned from its own click listener, the dialog opened, and
     * the control that assigned nothing did not.
     *
     * `updated` keeps its call, because the common case is a target that was
     * there all along and `commandForElement` should be readable before anybody
     * clicks anything. This is the guarantee, not the mechanism. */
    this.linkCommand()

    // Before the type check, which returns for `button`, the default and the
    // type every invoker in this library uses.
    this.sendCommand()

    if (this.type === 'button') {
      return
    }

    const { form } = this
    if (!form) {
      return
    }

    if (this.type === 'submit') {
      this.submit(form)
    } else {
      form.reset()
    }
  }

  /**
   * What activating the button does to its form.
   */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button'

  /**
   * The value this button submits under its own `name`, as a native submit
   * button does.
   *
   * **Sent with exactly the submission this button starts and not otherwise.**
   * A native submit button contributes `name=value` only when it is the one
   * that submitted, and every other button on the form contributes nothing,
   * which is what the native button standing in for this one at submit does.
   *
   * `CopyButton` has a `value` of its own meaning the text to put on the
   * clipboard, which is not this and is why it is declared there rather than
   * inherited.
   */
  @property()
  value = ''

  /**
   * Submits the form as this button, through a native submit button carrying
   * its name, value and overrides. See `formAction`.
   */
  private submit(form: HTMLFormElement): void {
    submitAs(form, this)
  }

  /**
   * The element this button's command is sent to, resolved.
   *
   * The platform's own accessor, because the resolution is otherwise kept
   * inside: `linkCommand` writes the target onto the inner `<button>`, where a
   * consumer cannot reach it, and `commandFor` answers with an id rather than
   * an element. Writing assigns the inner control directly, which is what an
   * invoker without an id in the same tree needs.
   */
  get commandForElement(): Element | null {
    const button = this.renderRoot?.querySelector('button') as
      | (HTMLButtonElement & { commandForElement?: Element | null })
      | null
    return button?.commandForElement ?? this.commandTarget()
  }

  set commandForElement(target: Element | null) {
    const button = this.renderRoot?.querySelector('button') as
      | (HTMLButtonElement & { commandForElement?: Element | null })
      | null
    if (button) {
      button.commandForElement = target
    }
  }

  /**
   * Points the inner button at the command's target, by reference.
   *
   * **The attribute cannot do this and it fails silently.** `commandfor` is an
   * IDREF, and an IDREF resolves inside the tree it is written in: forwarded
   * onto a button in this shadow root it looks for the id *here*, finds
   * nothing, and the trigger does nothing at all. Measured before this existed:
   * the button clicked, no `command` event was dispatched, and there was
   * nothing anywhere to say why.
   *
   * `commandForElement` takes an element instead, and an element reference
   * resolves outward: a node in a shadow root may point at one in the document.
   * The same asymmetry the listbox relies on for `aria-activedescendant`.
   */
  private linkCommand(): void {
    const button = this.renderRoot?.querySelector('button')
    if (!button || !supportsInvokers()) {
      return
    }
    ;(button as HTMLButtonElement & { commandForElement: Element | null }).commandForElement =
      this.commandTarget()
  }

  /** The element this button commands, or nothing. */
  private commandTarget(): HTMLElement | null {
    return this.commandFor ? elementById(this, this.commandFor) : null
  }

  /**
   * Sends the `command` event where the browser will not.
   *
   * Invoker commands are recent, and where they are missing `linkCommand` sets a
   * property that does not exist and returns, so the button does nothing at all
   * when clicked. Silently: the markup is right, the component is right, and
   * every `command` in the library is inert at once with no error to find.
   *
   * Only where the platform is absent, so a browser that has invokers sends
   * exactly one event and this sends none. Doing both would open a dialog and
   * immediately toggle it shut again, which is a worse bug than the one this
   * fixes and would only appear on the browsers that work.
   */
  private sendCommand(): void {
    if (!this.command || supportsInvokers()) {
      return
    }
    this.commandTarget()?.dispatchEvent(new HelixFallbackCommandEvent(this.command, this))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('pending', this.pending)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.linkCommand()
    if (changed.has('pending') && changed.get('pending') !== undefined) {
      this.sayPending()
    }
  }

  /** @internal A submit button is what its form's implicit submission presses. */
  protected override get submitsForm(): boolean {
    return this.type === 'submit'
  }

  /** @internal Pressed as the form's default button, through the inner control. */
  protected override activate(): void {
    this.partNamed('button')?.click()
  }

  /** The form whose Enter key this button listens to, as its default button. */
  private watched: HTMLFormElement | null = null

  /**
   * Presses this button for Enter in a native text field of its form, when it
   * is the form's default button.
   *
   * The platform cannot find a default button in a shadow root, so a form whose
   * only submit button is this one found none: with two fields Enter did
   * nothing, and with one it submitted without this button's name, value or
   * overrides. The event's default is prevented so a later native submit button
   * is not pressed instead.
   */
  private readonly pressOnEnter = (event: KeyboardEvent): void => {
    const form = this.watched
    if (
      event.key !== 'Enter' ||
      event.defaultPrevented ||
      !form ||
      !submitsOnEnter(event.composedPath()[0], form) ||
      defaultButton(form) !== this
    ) {
      return
    }
    event.preventDefault()
    if (!this.isDisabled && !this.pending) {
      this.activate()
    }
  }

  /** Listens to the form this button now belongs to, and to no other. */
  private watchForm(form: HTMLFormElement | null): void {
    if (form === this.watched) {
      return
    }
    this.watched?.removeEventListener('keypress', this.pressOnEnter)
    form?.addEventListener('keypress', this.pressOnEnter)
    this.watched = form
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.watchForm(this.form)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watchForm(null)
  }

  /** Called by the browser when the button's form changes. */
  formAssociatedCallback(form: HTMLFormElement | null): void {
    this.watchForm(form)
  }

  protected override render(): TemplateResult {
    const label = html`<slot name="start"></slot><slot part="text"></slot><slot name="end"></slot>`
    const stop = this.focusable ? nothing : '-1'

    return html`<button
      part="button"
      type="button"
      aria-expanded=${this.expanded === undefined ? nothing : String(this.expanded)}
      aria-haspopup=${this.popup ?? nothing}
      aria-busy=${this.pending ? 'true' : nothing}
      aria-disabled=${this.pending ? 'true' : nothing}
      aria-label=${this.label || nothing}
      command=${this.command || nothing}
      tabindex=${stop}
      ?disabled=${this.isDisabled}
      @click=${this.handleClick}
      @keydown=${this.notePress}
      @pointerdown=${this.notePress}
    >
      ${label}
    </button>${this.renderLive()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-button': HelixHeadlessButton
  }
}
