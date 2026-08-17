import { type CSSResultOrNative, css, LitElement } from 'lit'

/**
 * Applied to every Helix component's shadow root so component CSS can rely on
 * border-box on both sides of the shadow boundary. The light DOM gets the same
 * rule from `@helix-io/styles/base.css`.
 */
const BOX_SIZING = css`
  *,
  ::before,
  ::after {
    box-sizing: border-box;
  }
`

/**
 * Makes `hidden` work, which it does not otherwise.
 *
 * The UA stylesheet's `[hidden] { display: none }` is user-agent origin, so any
 * author declaration beats it, and a component whose `:host` sets a `display`
 * is doing exactly that. `<helix-grid hidden>` stayed visible; so did
 * `<helix-empty hidden>`, `<helix-flex hidden>` and fifty-four others. The
 * audit found three of them and the real count was fifty-seven, because every
 * component that lays itself out has the same fault and nothing connects them.
 *
 * Here rather than in each sheet, for the reason `box-sizing` is here: it is a
 * fact about every component, and fifty-seven copies is fifty-seven chances to
 * forget the fifty-eighth. `:host([hidden])` is one specificity step above a
 * bare `:host`, so it wins wherever it is injected and a component that
 * genuinely needs to override it still can.
 *
 * `!important` is deliberately not used. A component with a real reason to stay
 * laid out while hidden should be able to say so, and none of them can if this
 * is unanswerable.
 */
const HIDDEN = css`
  :host([hidden]) {
    display: none;
  }
`

/**
 * @summary Base class every Helix element extends.
 *
 * @description
 * Owns only what is universal: normalizing `box-sizing` inside the shadow root,
 * so component CSS can rely on border-box on both sides of the boundary.
 *
 * There is deliberately no `emit(name, detail)` helper. A dispatch through a
 * generic helper cannot be named by the manifest analyzer, which recorded the
 * parameter identifier and produced a phantom event on every element that
 * inherited it. Components dispatch concrete event classes from `events.ts`,
 * which the analyzer and TypeScript can both see.
 *
 * @since 0.1.0
 * @status experimental
 * @documentation https://helix.fusion.dev/core/helix-element
 */
export class HelixElement extends LitElement {
  /**
   * The element's semantics, set without touching the DOM.
   *
   * `ElementInternals` sets the implicit role, which an author's own `role`
   * attribute still overrides, and it writes no attribute. Setting `role` on the
   * host directly would: that is an attribute the element gives itself after it
   * upgrades, which a React consumer's server markup never had, and hydration
   * reports it as a mismatch.
   *
   * Available during server rendering. Lit's shim implements `attachInternals`,
   * so nothing here needs a guard.
   */
  protected readonly internals: ElementInternals

  constructor() {
    super()
    this.internals = this.attachInternals()
  }

  /**
   * Re-emits a native event from the host, under its own name.
   *
   * A native event fired by an inner `<input>` or `<textarea>` is not composed,
   * so it stops at the shadow boundary and a consumer listening on
   * `<helix-input>` hears nothing. Re-dispatching it from the host is what
   * makes the component behave like the control it wraps.
   *
   * The relayed event keeps the native name deliberately. `change` is `change`,
   * which is what a consumer already knows to listen for, and it is what
   * reaches React: its synthetic system claims `onChange` and wires it to that
   * name, so a prefixed one would never arrive.
   *
   * `composed` is not forced. It defaults to the original event's own value, so
   * a relayed `change` stops at the next shadow boundary exactly as a native
   * one would. Pass it explicitly only where escaping is the intent, and say so
   * where you do.
   */
  protected relayNativeEvent(event: Event, init?: EventInit): void {
    this.dispatchEvent(
      new Event(event.type, {
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
        ...init,
      }),
    )
  }

  /**
   * Prepends the shadow-root reset to every subclass's styles, so no component
   * has to remember to include it.
   */
  protected static override finalizeStyles(
    styles?: CSSResultOrNative | CSSResultOrNative[],
  ): CSSResultOrNative[] {
    return [BOX_SIZING, HIDDEN, ...LitElement.finalizeStyles(styles)]
  }
}
