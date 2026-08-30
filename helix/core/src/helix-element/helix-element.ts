import { type CSSResultOrNative, css, LitElement, type PropertyValues } from 'lit'
import { type StaticValue, unsafeStatic } from 'lit/static-html.js'
import { eventsForTag } from '../events/element-events.js'
import { helixEventNames } from '../events/events.js'

/**
 * Applied to every Helix component's shadow root so component CSS can rely on
 * border-box on both sides of the shadow boundary. The light DOM gets the same
 * rule from `@fusion.dev/helix-styles/base.css`.
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
 * is doing exactly that. Fifty-seven components stayed visible while hidden,
 * `<helix-grid>`, `<helix-empty>` and `<helix-flex>` among them, because every
 * component that lays itself out has the same fault and nothing connects them.
 *
 * Here rather than in each sheet, for the reason `box-sizing` is here: it is a
 * fact about every component, and fifty-seven copies is fifty-seven chances to
 * forget the fifty-eighth.
 *
 * **The selector is (0,3,0) on purpose, and the obvious (0,2,0) is not enough.**
 * A bare `:host([hidden])` beats a bare `:host`, but it only ties with the
 * `:host([attr])` rules a component uses to set its own `display`, and those win
 * on source order because they are injected after this. Measured, elements
 * styled that way still rendered while hidden: `flex[inline]` at `inline-flex`,
 * `divider[orientation="vertical"]` at `inline-block`, `text[as]` at `block`.
 * The `:not()` lifts it a step and it wins from first position, so the rule can
 * stay prepended.
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
 * Makes an element a scroll container, where a component says it is one.
 *
 * **A box that scrolls is the headless tier's, and the headless tier had no way to say
 * so.** `overflow` is what creates a scrollport: without it `scrollTop` is
 * permanently zero and every scroll API on the element is inert. So a component
 * that reads `scrollTop` and cannot declare `overflow` is one whose behavior
 * lives in somebody else's stylesheet.
 *
 * Measured before deciding: `helix-headless-scroll-area`, the component whose
 * entire purpose is scrolling, computes `overflow-y: visible` on its viewport
 * with `scrollHeight` equal to `clientHeight`. Standing alone it is a div, and
 * the virtual list is worse because it *acts* on the reading.
 *
 * **It goes here rather than in a stylesheet**, beside `BOX_SIZING`, `HIDDEN`
 * and `SETTLED`, which are the token-free structural rules `core` ships into
 * every shadow root. "The headless tier has no CSS" has never meant `core` has
 * none; it means `helix/headless` must not depend on
 * `@fusion.dev/helix-styles`, and a rule with no token in it does not.
 *
 * **And a rule rather than an inline style, which was the first idea and is
 * wrong.** An inline `style` on a rendered part outranks every author rule
 * short of `!important`, so a consumer wanting `overflow: hidden` on that part
 * would have to fight it and would need `!important` of their own. A shadow rule
 * loses to a document rule, so `::part(viewport) { overflow: … }` from a
 * consumer simply wins, which is the right way round.
 *
 * Both axes, and nothing else. Which *kind* of scrolling, how much room,
 * `overscroll-behavior`, `scroll-snap`, a gutter, a scrollbar treatment: those
 * are decisions and stay in `helix/styled`. This is only the mechanism, and the
 * styled sheet is prepended-after so it overrides at equal specificity anyway.
 *
 * **A component marks a box whose scroll state it reads, and no other**, which
 * is narrower than "every box that ends up scrolling". `Megamenu`'s panel
 * scrolls, and only because the styled tier gives it a `max-block-size`: that is
 * a decision, the `overflow` that serves it belongs with it, and the headless
 * tier never asks the panel where it is scrolled to. Marking it anyway moved a
 * heading four pixels, because `overflow` establishes a block formatting context
 * and margins that had been collapsing stopped. A mechanism with a layout
 * consequence is one to apply exactly where it is needed.
 *
 * Three qualify: `ScrollArea`, `VirtualList` and `Carousel`, each of which
 * reads `scrollTop` or `scrollLeft` and acts on the answer.
 */
const SCROLLER = css`
  [data-scroller] {
    overflow: auto;
  }
`

/**
 * Stops a component animating its own arrival.
 *
 * A shadow root's stylesheets are adopted when the element upgrades, which is
 * after the element has already had a computed style. So the first resolution
 * that sees a component's own sheet is a *change*, from whatever the property's
 * initial value is to whatever the sheet says, and any `transition` the sheet
 * declares on that property runs against it. Nothing was interacted with and
 * nothing changed state: the component is animating the fact that its CSS
 * arrived.
 *
 * It shows wherever the initial value and the resting value differ visibly, and
 * `border-color` is the worst case, because its initial value is `currentColor`.
 * App Header reserves its border box and paints it `transparent` by default, so
 * on every load and every cross-document navigation it faded a one pixel
 * `currentColor` hairline out over `--helix-duration-normal`: near-black in
 * light mode, which reads as an intentional rule under the bar, and near-white
 * in dark mode, which reads as a bright sliver under the masthead. Measured on
 * the landing page with nothing touched and no pointer in the window, two
 * families ran five such transitions: App Header's bottom border and all four
 * of Card's.
 *
 * Here rather than in those two sheets, for the reason `box-sizing` and
 * `hidden` are here. It is a fact about every component that declares a
 * transition, the count of those grows, and a sheet cannot see the problem: the
 * rule that is wrong is the one that looks most ordinary.
 *
 * **`!important`, because specificity cannot be relied on.** A component's own
 * transition can be declared on `:host` (0,1,0) or on a part under a host
 * condition (0,3,0), and this rule has to beat both without knowing which. From
 * inside the shadow tree it is also the only weight that outranks a consumer's
 * document rule, which would otherwise re-introduce the flash from outside.
 *
 * The state is set a frame after the first update rather than in
 * `firstUpdated`, and that is the whole mechanism rather than a detail. Lit's
 * upgrade, render and `firstUpdated` all run in one microtask checkpoint, so a
 * flag set there lands in the same style resolution as the adopted sheets and
 * the transition runs anyway. A frame later, the resting value has already been
 * resolved with transitions off, so enabling them changes nothing and there is
 * nothing left to animate.
 *
 * **`:state()` and never an attribute.** The host is the element React owns, and
 * a definition that lands during module evaluation has a frame to spend before
 * React arrives, so an element writing `[data-settled]` onto its own host leaves
 * React hydrating a DOM that gained an attribute since the server wrote it.
 * Deferring a registration so the frame falls the other side of hydration is a
 * fix for the timing rather than for the cause, which is that a component's
 * private bookkeeping was being kept somewhere React reconciles.
 *
 * A custom state is not in the DOM. It carries the fact to this stylesheet and
 * nothing to the markup, so a server's output and a hydrated client's agree by
 * construction. Pagination reached the same conclusion for `:state(empty)` and
 * says so in its own sheet.
 */
const SETTLED = css`
  :host(:not(:state(settled))),
  :host(:not(:state(settled))) * {
    transition: none !important;
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
 *
 * **A miss must not erase it.** A re-scan that writes its own result back
 * unconditionally sets the key to `undefined` on every dispatch from a node
 * React does not own, and the next React-owned node pays for a full scan again.
 * Most elements in this library are rendered by Lit inside a shadow root and are
 * exactly that kind of node, so the cache is cleared constantly by the
 * components least able to benefit from it. Measured, 20,000 dispatches: 5.3ms
 * with a warm cache against 20.3ms alternating one owned node with one that is
 * not, roughly twice the per-dispatch cost for the half that should have been
 * free.
 *
 * So a miss leaves the cache alone and only a *different* key replaces it, which
 * keeps the second-React-root case the note above is about.
 *
 * **What is left is a scan per dispatch on a page with no React at all**, since
 * there is no key to find and no honest way to conclude one will never appear:
 * a root can mount at any time, and memoizing "this node is not React's" would
 * silently disable the binding for any element that dispatches before React
 * commits, which is the exact failure this whole mechanism exists to repair.
 * It is around half a microsecond and it is filed rather than hidden.
 */
let reactPropsKey: string | undefined

/** The props React is holding for a node, if React is holding any. */
const reactPropsOf = (node: EventTarget): Record<string, unknown> | undefined => {
  const stash = node as unknown as Record<string, unknown>
  if (reactPropsKey !== undefined && stash[reactPropsKey] !== undefined) {
    return stash[reactPropsKey] as Record<string, unknown>
  }
  const found = Object.keys(stash).find((key) => key.startsWith(REACT_PROPS))
  if (found === undefined) {
    return undefined
  }
  reactPropsKey = found
  return stash[found] as Record<string, unknown>
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
 * bag as the only place to look, which the binding above already reads. Once per
 * element, because a warning that repeats on every keystroke is one a consumer
 * silences.
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
    if (!key.startsWith('on') || !key.includes('-')) {
      continue
    }
    const name = key.slice(2)
    if (!helixEventNames.has(name)) {
      console.warn(
        `${tag} was given \`${key}\`, and nothing dispatches \`${name}\`. TypeScript cannot ` +
          `check a hyphenated JSX prop, so this is the only place it shows up.`,
      )
      continue
    }
    /* **A real name on the element that does not send it**, which is the mistake
       made while writing a *correct* event and so the one the name check could
       never see. The event usually does reach this element, being composed and
       bubbling, but React binds an `on` prop by reading it as the element itself
       dispatches: one merely passing through never calls this host's own
       `dispatchEvent`, so the prop is recorded and never wired.

       Silent when nothing registered the tag, which is a component from outside
       this library or a package built before the map existed. */
    const mine = host instanceof Element ? eventsForTag(host.localName) : undefined
    if (mine && !mine.has(name)) {
      console.warn(
        `${tag} was given \`${key}\`, but it dispatches ${[...mine].map((one) => `\`${one}\``).join(', ')}. ` +
          `\`${name}\` is sent by a different element, and React only wires an \`on\` prop on the ` +
          'element that dispatches, so this handler will never run. Put it on that element.',
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
 * onhelix-before-change <- helix-before-change  REACHED (React binds it with addEventListener)
 * onChange       <- change        REACHED    (React's delegated root listener)
 * onLoad         <- load          not reached
 * onError        <- error         not reached
 * onEnded        <- ended         not reached
 * ```
 *
 * React binds a hyphenated prop directly on the element, so our own events are
 * reached by name and are safe to bind again: same type, same callback, same
 * capture flag is a no-op by specification. A native name is different. React
 * recognizes `onChange` and `onLoad` as its own registration names and attaches
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
 * declared public API and all of them otherwise silent in React.
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

/**
 * Assigns the object and function properties React is holding and never applied.
 *
 * **The same hydration bug as the handlers above, and it needed its own fix.**
 * React skips every prop it would have to apply imperatively while hydrating,
 * not only listeners. Strings, numbers and booleans arrive anyway, because the
 * server wrote them as attributes and Lit converts them back. An object or a
 * function arrives by no route at all, and both halves of React agree to drop
 * it: the server renderer reaches its custom element branch, finds
 * `typeof value === 'object'` and `continue`s, so nothing is written into the
 * HTML; and the client's hydrate path only diffs and warns for a custom element,
 * never reaching `setPropOnCustomElement`. Two skips that match, so there is no
 * mismatch to report and no warning anywhere.
 *
 * **The binding trick above does not transfer, which is why this is separate.**
 * A listener only has to exist by the time somebody interacts, so binding it at
 * dispatch is late enough that hydration has certainly finished and early enough
 * to catch the event being sent. A property has to be right before the first
 * paint. `connectedCallback` is the obvious early moment and is the wrong one,
 * measured: an element upgrades when its definition loads, which falls either
 * side of hydration depending on how the consumer imported it, and on the side
 * this is for it is too early to see anything.
 *
 * **Only what the class declared, and only what could not have arrived as an
 * attribute.** The first is what stops an arbitrary JSX prop being written onto
 * the element; the second is what keeps this to the properties that are actually
 * broken, rather than re-applying a string that is already correct. Three
 * qualify today, `rows` on the data table and `cell` and `compare` on a table
 * column; the remaining `attribute: false` properties are booleans and strings a
 * parent writes at runtime, which no consumer passes and this never touches.
 *
 * **`null` is the one place this does not reproduce a client mount, and it is
 * deliberate.** `typeof null` is `'object'`, and React assigns a null prop on a
 * client mount while dropping it on the server, so it is genuinely inside the
 * gap this closes. Assigning it would faithfully reproduce a crash: the server
 * left the class default standing, and replacing that default with `null` is the
 * one case where closing the gap makes the page worse than leaving it open.
 *
 * Idempotent, so the handover needs no bookkeeping. Lit compares by identity, so
 * React's next commit assigning the same value schedules no update, and one
 * assigning a different value is a change whoever writes it.
 */
const applyReactProperties = (host: HelixElement): boolean => {
  const props = reactPropsOf(host)
  if (props === undefined) {
    return false
  }
  const target = host as unknown as Record<string, unknown>
  for (const name of (host.constructor as typeof HelixElement).elementProperties.keys()) {
    /* `hasOwn` rather than `in`, because the bag is a plain object and a
       component is free to declare a property called `constructor` or
       `toString`. A symbol can be a declared property name and can never be a
       JSX prop, so it is skipped before the lookup rather than stringified into
       one that cannot match. */
    if (typeof name !== 'string' || !Object.hasOwn(props, name)) {
      continue
    }
    const value = props[name]
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      continue
    }
    if (target[name] !== value) {
      target[name] = value
    }
  }
  return true
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
   * The prefix this tier registers its elements under.
   *
   * **A component that renders another renders its own tier's version of it**,
   * so `helix-headless-pagination-size` composes `helix-headless-select` and
   * `helix-pagination-size` composes `helix-select`. One template says
   * `${this.tag('select')}` and each tier answers with its own name.
   *
   * **The public tag may not be the composed one, in either tier.** Using it
   * costs three things: the name means two different things depending on what a
   * consumer imported, the headless tier composes an element it does not ship,
   * and the composition cannot be tested there at all, because there is no
   * `helix-select` on that tier to test it against.
   *
   * **A prefix rather than an override per composition**, which was the first
   * plan and does not compile. An override re-renders the fragment from the
   * subclass, and the fragment reads members the base keeps private:
   * `PaginationSize` alone would have had to widen `options`, `current` and
   * `handleChange` to `protected` so a subclass could say the same thing again.
   * Sixteen families of that is a lot of encapsulation spent on saying one
   * word differently.
   */
  static tier = 'helix-headless-'

  /**
   * One composed tag, as a static value a template can interpolate.
   *
   * `unsafeStatic` is safe by construction: the name is a literal in our own
   * source and the prefix is one of two strings this class defines. Called per
   * render and not cached, which costs nothing, because `static-html` keys its
   * template cache on the joined string rather than on the object.
   */
  protected tag(name: string): StaticValue {
    return unsafeStatic(`${(this.constructor as typeof HelixElement).tier}${name}`)
  }

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

  /**
   * Records a boolean fact about this element as a custom state.
   *
   * **The host belongs to whoever rendered it, and a component's own
   * bookkeeping may not be kept there.** An attribute written on the first
   * update is markup a consumer's server never sent, so a React consumer
   * hydrates a DOM that has gained attributes since and reports a mismatch it
   * will not patch up. A custom state is not in the DOM at all: it carries the
   * fact to a stylesheet through `:state()` and leaves the markup alone, so the
   * server's output and the client's agree by construction.
   *
   * `SETTLED` carries the long version of that argument; `checked`, `open`,
   * `invalid` and `has-label` are recorded the same way, each of them a state a
   * `default-*` attribute resolves before React reaches the node.
   *
   * **Deferring the definitions is not a fix and could not be.** Importing them
   * from an effect so the upgrades fall the other side of hydration works only
   * while hydration is one pass: anything that splits it, a streamed segment or
   * a suspended boundary, puts an upgrade back inside the window. Timing cannot
   * be the guarantee when the fact is kept somewhere React reconciles.
   *
   * Feature-tested rather than assumed, the way `hostAria` tests element
   * references. An engine without `CustomStateSet` records nothing and keeps
   * whatever the resting rule draws, which is the safe direction to fail, and
   * Lit's server shim is one of them: a custom state is a fact about a running
   * element, and a server has nothing to say about it.
   */
  protected toggleState(name: string, on: boolean): void {
    if ('states' in this.internals) {
      this.internals.states[on ? 'add' : 'delete'](name)
    }
  }

  /**
   * Resolves a frame after the first update, when transitions are switched on.
   *
   * **Named `whenSettled` because `settled` was taken four times over.** Image
   * and Splitter each have a private `settle`, and both color controls carry a
   * `settled` of their own, all of them older than this and none of them about
   * transitions. A base class takes the name every subclass then cannot use, so
   * it takes the one nobody wanted.
   *
   * **The state it reports cannot be watched, which is why this exists.** A
   * `MutationObserver` could see `[data-settled]` arrive and there is no
   * equivalent for `ElementInternals.states`: a custom state is deliberately not
   * in the DOM, which is the whole reason it replaced the attribute. Anything
   * that used to wait on the attribute waits on this instead, and gets a better
   * signal for it, an awaited promise being what the callers wanted rather than
   * a mutation they had to interpret.
   *
   * Separate from `updateComplete`, which resolves in the microtask checkpoint
   * the suppression is still active in. That is the distinction `readyToMove`
   * in `@fusion.dev/helix-testing` is written around.
   *
   * It never resolves where `requestAnimationFrame` never fires, which is a
   * server, a hidden tab, and happy-dom. Callers that must not hang race it
   * against a timeout; `readyToMove` does exactly that.
   */
  readonly whenSettled: Promise<void>

  /** Resolves `whenSettled`, once, from the frame that records the state. */
  private resolveSettled: () => void = () => {}

  constructor() {
    super()
    this.internals = this.attachInternals()
    this.whenSettled = new Promise<void>((resolve) => {
      this.resolveSettled = resolve
    })
  }

  /**
   * Announces an event, having first bound whatever React is holding for it.
   *
   * Every event this library sends passes through here, the concrete classes in
   * `events.ts` and the relayed native ones alike, and `requestChange`
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
   * Stops an inner control's own announcement at this element's boundary.
   *
   * **A composed control is one control to a consumer, and the natives had no
   * equivalent of the stop the prefixed events already get.** `<helix-select>`
   * renders a `<helix-listbox>`, and both announce: the listbox dispatches
   * `input` and `change` from its own host, `input` is composed by
   * specification, and a consumer listening on the select therefore heard one
   * choice twice. Measured before this existed, on the styled tier, one choice
   * on the inner listbox: select `input` twice and `change` three times,
   * combobox, date input, time input and color input twice each. `Command` was
   * the only one that was right, because it happened to reach for
   * `stopImmediatePropagation` for a different reason.
   *
   * Bound on the child in the parent's template, so it runs while the event is
   * still at the child and before it can cross. The guard is for the case where
   * a component binds this on itself: an element must never stop its own
   * announcement, which is the one it exists to make.
   *
   * This is the same job the `helix-before-*` handlers do with their own
   * `stopPropagation`, and it is separate rather than folded into them because
   * a consumer may legitimately refuse a request without the notification ever
   * happening: the two travel at different times and one can be absent.
   */
  protected readonly stopInner = (event: Event): void => {
    if (event.target !== this) {
      event.stopPropagation()
    }
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
    return [BOX_SIZING, HIDDEN, SCROLLER, SETTLED, ...LitElement.finalizeStyles(styles)]
  }

  /**
   * Marks the component's first style resolution as done, so `SETTLED` stops
   * suppressing transitions.
   *
   * A frame later, not now: see `SETTLED` for why `firstUpdated` itself is too
   * early. SSR never calls this, which is correct, because the state describes
   * something that happened in a browser and the server has no frame to wait
   * for.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* **The first of two looks, and the one that costs nothing.** It succeeds
       whenever the definition landed after React hydrated, which is the ordering
       a deferred or lazily imported element has: the bag is already on the node,
       and the update this assignment schedules is a microtask, so the value is
       rendered in the same task the upgrade happened in. See
       `applyReactProperties`. */
    const applied = applyReactProperties(this)
    requestAnimationFrame(() => {
      /* Through `toggleState`, which carries the feature test. A component that
         cannot record the state keeps its transitions suppressed, which is the
         safe direction to fail: nothing animates that should not. */
      this.toggleState('settled', true)
      this.resolveSettled()
      /* **Audited here as well as at dispatch, and this is the half that catches
         the real mistake.** From inside `dispatchEvent` alone, an element holding
         a handler prop and sending nothing is never looked at, and a prop on the
         wrong element is exactly the case where that element has no reason to
         dispatch.

         A frame late, alongside the settled state, because React has to have
         committed its props for there to be anything to read. Once per element
         either way: the audit holds its own set. */
      const props = reactPropsOf(this)
      if (props !== undefined) {
        /* **The other ordering, and the second and last look.** A definition
           evaluated with the client bundle upgrades before React hydrates, so
           there was no bag to read above. A frame callback runs in the rendering
           step *before* paint and the Lit update it schedules is a microtask, so
           the value still reaches the screen in this frame rather than after an
           empty one.

           Two looks and no loop, because the only ordering neither covers is
           React splitting hydration across frames, which nothing here has
           produced. If a component ever shows up empty on a page large enough to
           do that, this is the line to raise, and the measurement is what should
           decide by how much rather than a number chosen now. */
        if (!applied) {
          applyReactProperties(this)
        }
        auditReactProps(this, props)
      }
    })
  }
}
