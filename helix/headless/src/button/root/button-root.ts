import {
  AriaForwardController,
  customElement,
  HelixFallbackCommandEvent,
  HelixFormElement,
  supportsInvokers,
} from '@helix-io/core'
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
 * is a recipe in the base layer: `<Link data-button="primary">` is the same
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
 * @status experimental
 * @category actions
 * @documentation https://helix.fusion.dev/components/button
 *
 * @slot - The button's label.
 * @slot start - Content before the label, usually an icon.
 * @slot end - Content after the label.
 *
 * @csspart button - The inner control.
 */
@customElement('helix-base-button')
export class HelixBaseButton extends HelixFormElement {
  /* A consumer's `aria-describedby` names ids in their tree and this control is
     in a shadow root, so the reference has to be carried down as an element
     rather than copied as an id. See the controller: measured, the host held
     the description and the accessibility tree exposed the inner control
     without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.renderRoot?.querySelector<HTMLElement>('[part="button"]') ?? null,
  })

  /** What activating the button does to its form. */
  @property()
  type: 'button' | 'submit' | 'reset' = 'button'

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
   */
  @property()
  command = ''

  /** The id of the element the command is sent to. */
  @property({ attribute: 'commandfor' })
  commandFor = ''

  /** Moves focus to the inner control, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  private readonly handleClick = (): void => {
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
      form.requestSubmit()
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
   * The same asymmetry the listbox relies on for `aria-activedescendant`, and
   * the second place in this library where the id form is the one that cannot
   * work.
   *
   * The id is looked up in the host's own root rather than the document, so a
   * button inside somebody else's shadow root finds a target in that same root
   * and not a coincidence in the page.
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
   * Invoker commands are recent, and where they are missing `linkCommand` set a
   * property that does not exist and returned, so the button did nothing at all
   * when clicked. Silently: the markup was right, the component was right, and
   * every `command` in the library was inert at once with no error to find. A
   * design system cannot ship an example that depends on a feature failing that
   * quietly.
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
    'helix-base-button': HelixBaseButton
  }
}
