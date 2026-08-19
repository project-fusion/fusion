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
 * forget the fifty-eighth.
 *
 * **The selector is (0,3,0) on purpose, and the obvious (0,2,0) is not enough.**
 * A bare `:host([hidden])` beats a bare `:host`, which is what the first version
 * of this rule assumed and it was wrong: six components set their `display` from
 * an attribute selector at the *same* (0,2,0) and win on source order because
 * they are injected after this. Measured, all five still rendered while hidden:
 * `flex[inline]` at `inline-flex`, `divider[orientation="vertical"]` at
 * `inline-block`, and `text[as]`, `checkbox[appearance="card"]` and
 * `radio[appearance="card"]` at `block`. The `:not()` lifts it a step and it
 * wins from first position, so the rule can stay prepended.
 *
 * **And the `:not()` is load-bearing beyond specificity.** `hidden="until-found"`
 * is how the platform lets find-in-page reveal collapsed content: the browser
 * removes the attribute when a match is inside. Hiding it with `display: none`
 * makes it unfindable, so the one form of `hidden` that is *meant* to be
 * searchable is the one form this must not touch.
 *
 * `!important` is deliberately not used. A component with a real reason to stay
 * laid out while hidden should be able to say so, and none of them can if this
 * is unanswerable.
 */
const HIDDEN = css`
  :host([hidden]:not([hidden='until-found'])) {
    display: none;
  }
`

/**
 * The prefix React puts on the props bag it stashes on every node it owns.
 *
 * The rest of the key is a random suffix generated per page, so the whole thing
 * has to be discovered rather than written down.
 */
const REACT_PROPS = '__reactProps$'

/**
 * The discovered key, which is the same for every node on a page.
 *
 * Cached because `helix-caret` fires on every keystroke and a scan per dispatch
 * would be a scan per keystroke. Re-scanned whenever the cached key comes back
 * empty, so a second React root with a suffix of its own still resolves.
 */
let reactPropsKey: string | undefined

/** The props React is holding for a node, if React is holding any. */
const reactPropsOf = (node: EventTarget): Record<string, unknown> | undefined => {
  const stash = node as unknown as Record<string, unknown>
  if (reactPropsKey !== undefined && stash[reactPropsKey] !== undefined) {
    return stash[reactPropsKey] as Record<string, unknown>
  }
  reactPropsKey = Object.keys(stash).find((key) => key.startsWith(REACT_PROPS))
  return reactPropsKey === undefined ? undefined : (stash[reactPropsKey] as Record<string, unknown>)
}

/**
 * Binds the handler React is holding for this event, if it has not bound it.
 *
 * **React attaches no custom element listener while hydrating.** Measured in
 * Chrome against 19.2.8: on a server-rendered page every `onhelix-*` prop is
 * dead, whatever it is called, until React commits an update for some other
 * reason, at which point it silently starts working. That is why it looks fine
 * while developing and fails on a page somebody actually loaded. It is React's
 * own bug, filed as facebook/react#35446 and unfixed, and it is not something a
 * consumer can be asked to work around per component.
 *
 * The handler is on the node the whole time: React stashes the props it is
 * holding under a key of its own, hydration included. So the element reads it
 * and binds it itself, immediately before announcing, which is late enough that
 * hydration has certainly finished and early enough that this dispatch reaches
 * the listener just added.
 *
 * **The raw prop function is bound, never a wrapper, and that is what makes it
 * safe.** Two independent mechanisms stop it firing twice. If React has already
 * bound this handler, `addEventListener` with the same type, callback and
 * capture flag is a no-op by specification. And when React next commits, it
 * removes the previous handler before attaching its own, which matches ours
 * exactly, so ownership passes over cleanly. Measured across a commit: four
 * dispatches, four calls.
 *
 * If React ever renames its key this finds nothing and does nothing, which
 * returns the pre-hydration behavior rather than breaking anything.
 *
 * **Hyphenated names only.** A relayed native event keeps its native name and
 * goes through React's synthetic system, which hydration does set up. `onChange`
 * is React's to bind, and reaching for `onchange` here would put a second
 * listener beside it.
 */
const bindReactHandler = (host: EventTarget, type: string): void => {
  if (!type.includes('-')) {
    return
  }
  const handler = reactPropsOf(host)?.[`on${type}`]
  if (typeof handler === 'function') {
    host.addEventListener(type, handler as EventListener)
  }
}

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
   * Announces an event, having first bound whatever React is holding for it.
   *
   * Every event this library sends passes through here, the concrete classes in
   * `events.ts` and the relayed native ones alike, and `requestControlledChange`
   * dispatches through the host as well. One override therefore covers all
   * ninety-seven of them, which is the reason it is here rather than at each
   * dispatch. See `bindReactHandler`.
   *
   * @internal
   */
  override dispatchEvent(event: Event): boolean {
    bindReactHandler(this, event.type)
    return super.dispatchEvent(event)
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
