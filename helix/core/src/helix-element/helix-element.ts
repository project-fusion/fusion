import { type CSSResultOrNative, css, LitElement } from 'lit'
import { helixEventNames } from '../events/events.js'

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

/** Elements whose handler props have been read once. */
const audited = new WeakSet<EventTarget>()

/**
 * Properties that were public API until 19 Aug 2026 and are events now.
 *
 * Worth naming for a release or two: they were documented, a consumer may have
 * written one, and removing a property is silent in a way removing an event is
 * not.
 */
const REMOVED = new Set(['onActiveChange', 'onCheckedChange', 'onOpenChange', 'onValueChange'])

/**
 * Says so when a handler prop is attached to nothing.
 *
 * **TypeScript will not catch any of this, and that is not our tooling's
 * fault.** A JSX attribute whose name is not a valid identifier is exempt from
 * checking on an intrinsic element, and every one of ours carries a hyphen. So
 * `onhelix-opne` type-checks, `on:helix-open` type-checks, and a made-up
 * `totally-invented` prop type-checks, all against fully generated types that
 * do reject a wrong *value* on a normal attribute. Measured with `tsc`.
 *
 * That leaves runtime as the only place a typo can be caught, and React's props
 * bag as the only place to look, which the binding above already reads. Once
 * per element, like the controlled-change audit, and for the same reason: a
 * warning that repeats on every keystroke is one a consumer silences.
 *
 * `on:helix-open` gets its own message because it is not a mistake so much as
 * the wrong dialect. It is what the Solid types offer, correctly, and React
 * binds it as an event named `:helix-open`.
 */
const auditReactProps = (host: EventTarget, props: Record<string, unknown>): void => {
  if (audited.has(host)) {
    return
  }
  audited.add(host)
  const tag = host instanceof Element ? `<${host.localName}>` : 'A Helix element'
  for (const key of Object.keys(props)) {
    if (key.startsWith('on:')) {
      console.warn(
        `${tag} was given \`${key}\`, which is Solid's syntax. React binds the name after \`on\` ` +
          `verbatim, so this listens for an event called \`${key.slice(2)}\`. Write \`on${key.slice(3)}\`.`,
      )
      continue
    }
    if (REMOVED.has(key)) {
      console.warn(
        `${tag} was given \`${key}\`, which was removed. It never worked from JSX, because React ` +
          `binds any \`on\` prop as an event of that name. Listen for the element's change event instead.`,
      )
      continue
    }
    if (key.startsWith('on') && key.includes('-') && !helixEventNames.has(key.slice(2))) {
      console.warn(
        `${tag} was given \`${key}\`, and nothing dispatches \`${key.slice(2)}\`. TypeScript cannot ` +
          `check a hyphenated JSX prop, so this is the only place it shows up.`,
      )
    }
  }
}

/*
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
 * **Relayed native events are handled too, on a different rule.** See
 * `reactPropFor`: a bubbling one already reaches React's delegated listener and
 * must not be bound twice, and a non-bubbling one reaches nothing at all.
 */
/**
 * Events React already wires on a custom element, whatever their bubbling.
 *
 * `setPropOnCustomElement` calls `listenToNonDelegatedEvent` for these two by
 * name, and assigns a no-op `onclick` so the delegated path picks up clicks.
 * Nothing here relays them today; the list exists so that the day something
 * does, it does not arrive twice.
 */
const REACT_WIRES = new Set(['scroll', 'scrollend'])

/**
 * The prop React would be holding for this event, if it is holding one.
 *
 * **A relayed native event needs a different answer from one of ours, and
 * getting it wrong doubles every call.** Measured against React 19.2.8:
 *
 * ```
 * onhelix-change <- helix-change  REACHED    (React binds it with addEventListener)
 * onChange       <- change        REACHED    (React's delegated root listener)
 * onLoad         <- load          not reached
 * onError        <- error         not reached
 * onEnded        <- ended         not reached
 * ```
 *
 * React binds a hyphenated prop directly on the element, so our own events are
 * reached by name and are safe to bind again: same type, same callback, same
 * capture flag is a no-op by specification. A native name is different. React
 * recognises `onChange` and `onLoad` as its own registration names and attaches
 * nothing to the element for either; it relies on a delegated listener at the
 * root, which sees an event only if it **bubbles**, and on a non-delegated list
 * it sets up for `<video>`, `<audio>` and `<img>` and never for a custom
 * element.
 *
 * So a bubbling relay already arrives and must not be bound again: React's
 * listener is at the root rather than on the element, so nothing deduplicates
 * it and the consumer's handler runs twice. A non-bubbling relay arrives
 * nowhere, and is the bug this exists to close: `<helix-avatar>` relays `load`
 * and `error`, `<helix-video>` relays `ended`, `play` and `pause`, all of them
 * declared public API, all of them silent in React until now. An avatar
 * fallback is a shipped feature that did nothing.
 *
 * The name is React's own casing, `onError` rather than `onerror`, because that
 * is what a consumer writes and therefore what is in the props bag. Every
 * native we relay is a single word, so capitalising the first letter is the
 * whole of the rule; a two-word name like `loadeddata` would be `onLoadedData`
 * and needs the list extending rather than the rule generalising.
 */
const reactPropFor = (event: Event): string | undefined => {
  if (event.type.includes('-')) {
    return `on${event.type}`
  }
  if (event.bubbles || REACT_WIRES.has(event.type)) {
    return undefined
  }
  return `on${event.type.charAt(0).toUpperCase()}${event.type.slice(1)}`
}

const bindReactHandler = (host: EventTarget, event: Event): void => {
  const props = reactPropsOf(host)
  if (props === undefined) {
    return
  }
  auditReactProps(host, props)
  const key = reactPropFor(event)
  const handler = key === undefined ? undefined : props[key]
  if (typeof handler === 'function') {
    host.addEventListener(event.type, handler as EventListener)
  }
}

/* **The same bug applies to object and function properties, and this does not
   fix those.** React skips every prop it would have to apply imperatively while
   hydrating, not only listeners. Strings, numbers and booleans arrive anyway,
   because the server wrote them as attributes and Lit converts them back; an
   object or a function is simply absent until React commits.

   The trick above does not transfer, and the reason is worth stating because it
   looks like it should. A listener only has to exist by the time somebody
   interacts, so binding it at dispatch is late enough that hydration has
   certainly finished and early enough to catch the event being sent. A property
   has to be right before the first paint, and there is no equally safe late
   moment. An earlier version of this bound at `connectedCallback` and caught
   nothing at all, measured: an element upgrades when its definition loads, which
   can fall either side of React's hydration.

   What would work, when something needs it: in `firstUpdated`, read the props
   bag and assign any declared reactive property (Lit hands them over as
   `elementProperties`) whose value is an object or a function, re-checking once
   on the next frame if React has not stashed anything yet. Assigning what React
   will assign on its own next commit is idempotent, so the handover costs
   nothing and needs no bookkeeping.

   It is deliberately not built. No component here declares an object or array
   property: the eight `attribute: false` properties are parent-to-child
   coordination written at runtime, not consumer API. A fix carrying a timing
   race, with no failing case to hold it honest, is a fix that rots. Build it
   with the first component that needs one, and measure the race against that
   component rather than against a guess. */

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
    bindReactHandler(this, event)
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
