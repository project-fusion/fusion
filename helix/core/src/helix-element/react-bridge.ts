import type { LitElement } from 'lit'
import { eventsForTag } from '../events/element-events.js'
import { helixEventNames } from '../events/names.js'
import { reportRuntime } from '../utils/report-runtime/report-runtime.js'

/*
 * What a Helix element does about React's hydration, kept out of the base class.
 *
 * Three call sites in `HelixElement` and everything they need is here: the
 * handler a prop holds is bound before an event is announced, the object and
 * function properties React never applied are assigned after the first update,
 * and the props bag is audited for a handler attached to nothing. The argument
 * for each is with the code it explains, and the whole of it should go the day
 * facebook/react#35446 is fixed, which is easier to see from one file than
 * from three hundred lines inside the base class.
 *
 * `fusion workspace audit`'s `react-bridge` reads `REACT_PROPS` out of whichever
 * file declares it and holds the installed `react-dom` to the version the
 * notes below were measured against.
 */

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
export const reactPropsOf = (node: EventTarget): Record<string, unknown> | undefined => {
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
 * Removed callback properties, named so a consumer who wrote one is told.
 *
 * They are events now. Removing a property is silent in a way removing an event
 * is not, so these are worth warning about for a release or two.
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
export const auditReactProps = (host: EventTarget, props: Record<string, unknown>): void => {
  if (audited.has(host)) {
    return
  }
  audited.add(host)
  const tag = host instanceof Element ? `<${host.localName}>` : 'A Helix element'
  const element = host instanceof Element ? host.localName : undefined
  for (const key of Object.keys(props)) {
    if (key.startsWith('on:')) {
      reportRuntime({
        kind: 'solid-handler-syntax',
        message:
          `${tag} was given \`${key}\`, which is Solid's syntax. React binds the name after \`on\` ` +
          `verbatim, so this listens for an event called \`${key.slice(2)}\`. Write \`on${key.slice(3)}\`.`,
        tag: element,
      })
      continue
    }
    if (REMOVED.has(key)) {
      reportRuntime({
        kind: 'removed-callback',
        message:
          `${tag} was given \`${key}\`, which was removed. It never worked from JSX, because React ` +
          `binds any \`on\` prop as an event of that name. Listen for the element's change event instead.`,
        tag: element,
      })
      continue
    }
    if (!key.startsWith('on') || !key.includes('-')) {
      continue
    }
    const name = key.slice(2)
    if (!helixEventNames.has(name)) {
      reportRuntime({
        kind: 'unknown-event',
        message:
          `${tag} was given \`${key}\`, and nothing dispatches \`${name}\`. TypeScript cannot ` +
          `check a hyphenated JSX prop, so this is the only place it shows up.`,
        tag: element,
      })
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
      reportRuntime({
        kind: 'misplaced-handler',
        message:
          `${tag} was given \`${key}\`, but it dispatches ${[...mine].map((one) => `\`${one}\``).join(', ')}. ` +
          `\`${name}\` is sent by a different element, and React only wires an \`on\` prop on the ` +
          'element that dispatches, so this handler will never run. Put it on that element.',
        tag: element,
      })
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
 * is what a consumer writes and therefore what is in the props bag. See
 * `reactNativeProp`.
 */
export const reactPropFor = (event: Event): string | undefined => {
  if (event.type.includes('-')) {
    return `on${event.type}`
  }
  if (event.bubbles || REACT_WIRES.has(event.type)) {
    return undefined
  }
  return reactNativeProp(event.type)
}

/**
 * React's casing for the native events whose names are two words run together.
 *
 * React spells these as two words, `onTimeUpdate` for `timeupdate`, and that
 * is the prop its own `<video>` typings teach a consumer to write. The media
 * names are the ones `Video` relays from its inner `<video>`; `scrollend` is
 * `Scroll Area`'s. A single word needs no entry: its first letter is the whole
 * of the rule.
 *
 * `@fusion.dev/helix-cem` keeps the same table for the typings it writes, and
 * its spec holds that copy to this one.
 */
export const REACT_CASING: Readonly<Record<string, string>> = {
  canplay: 'onCanPlay',
  canplaythrough: 'onCanPlayThrough',
  durationchange: 'onDurationChange',
  loadeddata: 'onLoadedData',
  loadedmetadata: 'onLoadedMetadata',
  loadstart: 'onLoadStart',
  ratechange: 'onRateChange',
  scrollend: 'onScrollEnd',
  timeupdate: 'onTimeUpdate',
  volumechange: 'onVolumeChange',
}

/**
 * The prop React reads for a native event: `onError` for `error`, and
 * `onTimeUpdate` for `timeupdate`.
 *
 * The JSX typings name the same props, so a consumer writes what this binds.
 */
export const reactNativeProp = (type: string): string =>
  REACT_CASING[type] ?? `on${type.charAt(0).toUpperCase()}${type.slice(1)}`

/**
 * The lowercase spelling of a native event's prop, `ontoggle` or `onchange`.
 *
 * **React binds it on the element, like one of ours, so it is bound the same
 * way.** It is no registration name of React's, so on a client mount React
 * adds it with `addEventListener` under the name after `on`, bubbling or not,
 * and while hydrating it adds nothing. Bound here, a later commit's own
 * listener is the same callback and a no-op. The typings offer this spelling
 * on every element that sends the event.
 */
const lowercasePropFor = (event: Event): string | undefined =>
  event.type.includes('-') || REACT_WIRES.has(event.type) ? undefined : `on${event.type}`

/**
 * Binds the handler React is holding for an event the host is about to send,
 * where React never bound it: under the event's React prop and its lowercase
 * spelling.
 *
 * Called by the host as it dispatches, which is the first moment it knows the
 * event's name. A host React does not render holds no props, and nothing is
 * bound. The props are audited on the way, so a handler attached to nothing
 * warns.
 */
export const bindReactHandler = (host: EventTarget, event: Event): void => {
  const props = reactPropsOf(host)
  if (props === undefined) {
    return
  }
  auditReactProps(host, props)
  for (const key of [reactPropFor(event), lowercasePropFor(event)]) {
    const handler = key === undefined ? undefined : props[key]
    if (typeof handler === 'function') {
      host.addEventListener(event.type, handler as EventListener)
    }
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
export const applyReactProperties = (host: LitElement): boolean => {
  const props = reactPropsOf(host)
  if (props === undefined) {
    return false
  }
  const target = host as unknown as Record<string, unknown>
  for (const name of (host.constructor as typeof LitElement).elementProperties.keys()) {
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
