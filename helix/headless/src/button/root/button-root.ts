import {
  AriaForwardController,
  customElement,
  HelixFallbackCommandEvent,
  HelixFormElement,
  supportsInvokers,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Triggers an action, submits a form, or navigates.
 *
 * @description
 * Renders a real `<button>`, so activation, focus, and the browser's own
 * affordances come from the platform rather than from key handlers.
 *
 * **It never renders an anchor.** A router has to render its own `<a>` to
 * intercept a click and cannot render one inside this shadow root, so a button
 * that could also be a link forced every such navigation to be a full page
 * load. A link that looks like a button is styling rather than behavior, so it
 * is a recipe in the base layer: `<Link data-button="solid">` is the same
 * control, and the consumer keeps their anchor.
 *
 * `delegatesFocus` puts focus on the inner control, and it serializes into the
 * server's markup, so the button is keyboard reachable before any JavaScript
 * loads.
 *
 * Form submission is explicit. A `<button type="submit">` inside a shadow root
 * submits nothing, because the form is on the other side of the boundary, so
 * the inner control is always `type="button"` and this element calls
 * `requestSubmit()` on its form instead. That routes through validation, unlike
 * `submit()`.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot end - Content after the label.
 * @slot start - Content before the label, usually an icon.
 *
 * @csspart button - The inner control.
 */
@customElement('helix-headless-button')
export class HelixHeadlessButton extends HelixFormElement {
  /* A consumer's `aria-describedby` names ids in their tree and this control is
     in a shadow root, so the reference has to be carried down as an element
     rather than copied as an id. See the controller: measured, the host held
     the description and the accessibility tree exposed the inner control
     without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.renderRoot?.querySelector<HTMLElement>('[part="button"]') ?? null,
  })

  /**
   * What activating the button does to its form.
   */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button'

  /**
   * What this button submits under its own `name`, the way a native submitter does.
   *
   * **Reported for exactly the submission this button starts and not otherwise.**
   * A native submit button contributes `name=value` only when it is the one
   * that submitted, and every other button on the form contributes nothing. A
   * form-associated element reporting a value continuously would contribute on
   * every submission whoever started it, which is a different feature wearing
   * the same name, so `submit` below sets it, submits, and clears it inside one
   * synchronous call.
   *
   * `CopyButton` has a `value` of its own meaning the text to put on the
   * clipboard, which is not this and is why it is declared there rather than
   * inherited.
   */
  @property()
  value = ''

  /**
   * Where this button's submission goes, overriding the form's own.
   *
   * **The five `form*` overrides work by writing the form and putting it back**,
   * which is the only mechanism available and is closer to the platform than it
   * sounds. `requestSubmit(submitter)` is how a native submitter carries these,
   * and it refuses ours twice over: the inner `<button>` is `type="button"` so
   * it is not a submit button, and it sits in this shadow root so its form owner
   * is not the consumer's form. Both throw. So the submission is started with no
   * submitter and the overrides are applied to the form for the duration of it.
   *
   * The whole submit algorithm runs synchronously inside `requestSubmit()`, so
   * the window is one call and a `finally` closes it whether or not a listener
   * refused. What a `submit` handler observes during that window is the form a
   * native submitter would have given it, which is the point.
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
   * Accessible name, for a button whose content is not text.
   *
   * Lives here rather than only on `IconButton` so the two share one render.
   * An icon-only button without it is a control a screen reader announces as
   * "button" and nothing else.
   */
  @property()
  label = ''

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
   * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
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

  /** Moves focus to the inner control, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleClick = (): void => {
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
   * Submits the form as this button, for the length of one call.
   *
   * Everything a native submitter carries is written onto the form, the
   * submission is started, and everything is put back. See `formAction` for why
   * `requestSubmit(submitter)` is not available to a control inside a shadow
   * root.
   *
   * `novalidate` is in the same list rather than reached by `form.submit()`,
   * which looks like the shortcut and is not: `submit()` skips the `submit`
   * event as well as the validation, so a consumer's handler would stop running
   * the moment somebody wrote `formnovalidate`. Turning the flag on and calling
   * `requestSubmit()` skips the validation alone, which is what the attribute
   * means.
   */
  private submit(form: HTMLFormElement): void {
    const undo: (() => void)[] = []
    const override = (attribute: string, value: string | null): void => {
      if (value === null) {
        return
      }
      const had = form.getAttribute(attribute)
      form.setAttribute(attribute, value)
      undo.push(() => {
        if (had === null) {
          form.removeAttribute(attribute)
        } else {
          form.setAttribute(attribute, had)
        }
      })
    }
    override('action', this.formAction || null)
    override('enctype', this.formEnctype || null)
    override('method', this.formMethod || null)
    override('novalidate', this.formNoValidate ? '' : null)
    override('target', this.formTarget || null)
    const reports = this.name !== ''
    if (reports) {
      this.internals.setFormValue(this.value)
    }
    try {
      form.requestSubmit()
    } finally {
      for (const put of undo) {
        put()
      }
      if (reports) {
        this.internals.setFormValue(null)
      }
    }
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

  /**
   * The element this button commands, or nothing.
   *
   * Looked up in the button's own root rather than in the document, so a button
   * inside somebody else's shadow root finds a target in that same root and not
   * a coincidence in the page.
   */
  private commandTarget(): HTMLElement | null {
    const root = this.getRootNode() as Document | ShadowRoot
    return this.commandFor ? (root.getElementById?.(this.commandFor) ?? null) : null
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

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.linkCommand()
  }

  protected override render(): TemplateResult {
    const label = html`<slot name="start"></slot><slot></slot><slot name="end"></slot>`
    const stop = this.focusable ? nothing : '-1'

    return html`<button
      part="button"
      type="button"
      aria-expanded=${this.expanded === undefined ? nothing : String(this.expanded)}
      aria-label=${this.label || nothing}
      command=${this.command || nothing}
      tabindex=${stop}
      ?disabled=${this.isDisabled}
      @click=${this.handleClick}
    >
      ${label}
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-button': HelixHeadlessButton
  }
}
