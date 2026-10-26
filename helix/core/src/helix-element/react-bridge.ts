import type { LitElement } from 'lit'
import { auditReactMissing, auditReactProps } from '#react-audit'
import { insideReact } from './react-root.js'

/*
 * What a Helix element does about React's hydration, kept out of the base class.
 *
 * Two call sites in `HelixElement` and everything they need is here: the
 * handler a prop holds is bound before an event is announced, and the object and
 * function properties React never applied are assigned after the first update.
 * The argument for each is with the code it explains, and the whole of it should
 * go the day facebook/react#35446 is fixed, which is easier to see from one file
 * than from three hundred lines inside the base class.
 *
 * **The audit of the props bag is not here**, because it is a warning and this
 * is what makes React work. It is `#react-audit`, which a development build
 * resolves to `react-audit.ts` and every other build to a function that does
 * nothing, as `#audit-name` is. See `react-audit.ts`.
 *
 * `fusion x workspace audit`'s `react-bridge` reads `REACT_PROPS` out of whichever
 * file declares it and holds the installed `react-dom` to the version the
 * notes below were measured against.
 *
 * **The measured range.** Measured against React 19.3.1 on October 25, 2026,
 * by `fusion/scripts/check-react-versions.mjs`, which renders a page with
 * `renderToString` and hydrates it in Chromium, production and development
 * builds, definitions loaded before and after `hydrateRoot`:
 *
 * ```
 * react-dom                          bridge needed   bridge works
 * 18.3.1                             yes             first press only, see below
 * 19.0.9                             yes             yes
 * 19.2.9                             yes             yes
 * 19.3.1 (latest)                    yes             yes
 * 19.3.0-canary-a6b912fb-20261023    yes             yes
 * ```
 *
 * "Needed" is read off a plain custom element given the same handler and
 * array: on every version, React reached neither. On React 18 the first press
 * and the array arrive, but React 18 binds no `on` prop on a custom element at
 * all, so each commit that hands it a new handler leaves the old one bound
 * here as well: two calls after one commit, three after two. Helix supports
 * React 19. The workflow `react-versions.yml` asks the same each week of
 * `latest` and `canary`, and says when a version stops needing this file; the
 * site's `check-hydration.mjs` asks the React the site installs, on every
 * pull request.
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

/**
 * The prefixes of the marks React leaves on a document it has a root in.
 *
 * **React marks the document before it hands any node there its props.**
 * `createRoot` and `hydrateRoot` call `listenToAllSupportedEvents` on their
 * container before anything renders, and that marks the container's document
 * as well, so React can listen for `selectionchange` there once. A portal into
 * another document marks that one. A node's props are written as React
 * renders into a root, so a document without either mark holds none, and an
 * element in it has nothing to look for yet.
 *
 * React 18 and 19 write `REACT_LISTENING` and a random suffix: read from the
 * source of 18.2.0, from react-dom 19.3.1, and from the build Next.js 16.3.8
 * ships for the App Router. React 17 keeps that mark on the container alone
 * and gives the document its set of listeners under `REACT_EVENTS`, read from
 * the source of 17.0.2.
 */
const REACT_LISTENING = '_reactListening'
const REACT_EVENTS = '__reactEvents$'

/**
 * The mark React left on the document a node is in, if React has a root there.
 *
 * A scan of the document's own keys, which are `location` and little else:
 * much cheaper than a scan of each element waiting to look. The mark's random
 * suffix is one React's own, so it also tells one React on a page from another.
 */
const reactMarkOf = (node: Node): string | undefined =>
  Object.keys(node.ownerDocument ?? node).find(
    (key) => key.startsWith(REACT_LISTENING) || key.startsWith(REACT_EVENTS),
  )

/**
 * How long an element keeps looking for React's props, and how often.
 *
 * **Two looks were one short of every Next.js App Router page.** React's props
 * bag has no arrival event, so the only way to read it is to look, and until
 * 16 Sep 2026 an element looked twice: once in `firstUpdated` and once a frame
 * later. Measured on a project scaffolded by `helix new --template
 * react-nextjs`, a data table whose `rows` is a prop, under `next dev` and under
 * `next build && next start`, five runs each: the bag landed on the *second*
 * frame after the first update, around 4.5 ms after the frame the second look
 * ran on, so both looks missed every time and the table drew its empty state
 * over data already sitting on the node.
 * `helix/docs/content/react.mdx` documents that prop as working, and nothing had
 * rendered a scaffolded project to find out.
 *
 * **The later looks are timers and never frames**, which is not a detail. A
 * component that draws in a loop books its next frame from each one, and that is
 * how a spec asks whether it is running: `framesBooked` counts every booking on
 * the page, so an element still looking for React would be read as a loop that
 * failed to stop. A commit is a task anyway, so a task is also the thing worth
 * waiting for.
 *
 * `LOOK_FOR` is twenty times that gap, and it is stated as a window so these
 * two constants stay the only place the arithmetic lives. The looking stops the
 * moment the bag is found.
 */
const LOOK_EVERY = 16
const LOOK_FOR = 96

/** An element still looking. */
interface Looking {
  /** The tick it started after. */
  after: number
  /** The element. */
  host: LitElement
  /** When it started, from `performance.now()`. */
  since: number
}

/**
 * Every element still looking, oldest first, in one list for the page.
 *
 * **One timer for all of them.** Each element booked its own six before
 * October 10, 2026, and 1,000 buttons booked 6,000 timers and scanned their own
 * keys at each, 8.4 ms of main thread in Chromium. One timer looks at every
 * element on each tick, and only while React has a root in the document: on a
 * page without React a tick is one scan of the document's keys. An element
 * leaves after its sixth tick, once `LOOK_FOR` has passed since it started, so
 * it looks at least as often and as long as it did on a timer of its own.
 */
const looking: Looking[] = []

/**
 * The root marks of the pages where an element has found React's props.
 *
 * **What makes a silent break loud.** A document carrying React's root mark
 * where no element ever finds a props bag is the one way this file fails
 * without a symptom of its own: React renamed the key, every handler on a
 * server-rendered page is dead again, and nothing says so. An element whose
 * window closes on such a page is handed to `auditReactMissing`, which in a
 * development build says so once. See `react-audit.ts`.
 *
 * Kept by mark rather than by document, because the mark's suffix is React's
 * own: a second copy of React on the page is a second question, and a spec can
 * stand for a new page by writing a new mark.
 */
const found = new Set<string>()

/** The ticks run so far, so an element can count its own. */
let ticks = 0

/** Whether the next tick is booked. */
let booked = false

/**
 * Reads the props React is holding for an element, assigns its properties
 * where `applied` says the first update did not, and says whether it found
 * any.
 */
const take = (host: LitElement, applied: boolean, mark: string): boolean => {
  const props = reactPropsOf(host)
  if (props === undefined) {
    return false
  }
  found.add(mark)
  if (!applied) {
    applyReactProperties(host)
  }
  auditReactProps(host, props)
  return true
}

/**
 * Looks at every element still looking, and lets go of those that are done.
 *
 * Whether React is on the page is asked once for each document in the list,
 * which is one document on nearly every page.
 */
const tick = (): void => {
  booked = false
  ticks += 1
  const now = performance.now()
  let page: Node | undefined
  let mark: string | undefined
  let kept = 0
  for (const one of looking) {
    const own = one.host.ownerDocument ?? one.host
    if (own !== page) {
      page = own
      mark = reactMarkOf(one.host)
    }
    const taken = mark !== undefined && take(one.host, false, mark)
    const over = ticks - one.after >= LOOK_FOR / LOOK_EVERY && now - one.since >= LOOK_FOR
    if (!taken && over && mark !== undefined && !found.has(mark)) {
      auditReactMissing(one.host, LOOK_FOR, mark)
    }
    if (!(taken || over)) {
      looking[kept] = one
      kept += 1
    }
  }
  looking.length = kept
  book()
}

/** Books the next tick, where an element is still looking. */
const book = (): void => {
  if (!booked && looking.length > 0) {
    booked = true
    setTimeout(tick, LOOK_EVERY)
  }
}

/**
 * Looks for React's props a frame after an element's first update, and goes
 * on looking for `LOOK_FOR` where they have not arrived.
 *
 * **The ordering this is for**: a definition evaluated with the client bundle
 * upgrades before React hydrates, so `firstUpdated` found no bag to read and
 * there may be none for a frame or two yet. `applied` says whether that first
 * look assigned the properties already.
 *
 * **Audited here as well as at dispatch, in a development build, and this is
 * the half that catches the real mistake.** From inside `dispatchEvent` alone,
 * an element holding a handler prop and sending nothing is never looked at,
 * and a prop on the wrong element is exactly the case where that element has
 * no reason to dispatch. Once per element either way: the audit holds its own
 * set.
 */
export const lookForReact = (host: LitElement, applied: boolean): void => {
  const mark = reactMarkOf(host)
  if (!(mark !== undefined && take(host, applied, mark))) {
    looking.push({ after: ticks, host, since: performance.now() })
    book()
  }
}

/**
 * How long `untilReactHydrated` waits for React to reach an element, at most.
 *
 * A bound, not a measurement: React hydrates a server-rendered page's shell
 * within a few frames, and a Suspense boundary waits for its data, which no
 * number here can know. An element under React's root that React never
 * reaches, such as one a script appended there, is let go at this point.
 */
const HYDRATION_BOUND = 5000

/**
 * Resolves once React has hydrated an element, and soon after where React
 * will not.
 *
 * **For a write onto markup a server rendered.** React compares a node's
 * attributes with the server's as it begins hydrating that node, and writes
 * the node's props as it completes it, after every node inside it. So once
 * the element holds React's props, it and every node in it have been
 * compared, and an attribute written then is no mismatch. Popover, Menu and
 * Megamenu write `aria-expanded` onto a plain slotted trigger, and before
 * October 25, 2026 they wrote it a frame after their first render. On a page
 * whose definitions load before `hydrateRoot`, that frame came before React
 * reached the trigger, and React reported "some attributes of the server
 * rendered HTML didn't match the client properties", measured against React
 * 19.3.1 with Megamenu and Popover.
 *
 * **A page whose mark has not arrived yet is waited for, for `LOOK_FOR`.** An
 * app that defines the elements and calls `hydrateRoot` after a gap, an
 * awaited import or a fetch, has no mark when the frame comes, and Megamenu
 * and Popover were written to early on exactly such a page. So a page without
 * the mark is looked at for the bridge's own window, and one that gains it is
 * waited for as any other. A page that calls `hydrateRoot` later than that is
 * still written to early, and a page without React pays the window once. On
 * the site, which defers registration past hydration, React held the
 * megamenu's props 7 to 33 ms after marking the page and 187 to 562 ms before
 * the element's first frame, six loads, so it waits for nothing.
 *
 * Resolves for an element outside the node React renders into. Asked on the
 * bridge's own interval, on a timer and never a frame, for the reason
 * `LOOK_EVERY` gives.
 */
export const untilReactHydrated = (host: Element): Promise<void> =>
  new Promise((done) => {
    const since = performance.now()
    const look = (): void => {
      const waited = performance.now() - since
      const marked = reactMarkOf(host) !== undefined
      if (
        (!marked && waited >= LOOK_FOR) ||
        reactPropsOf(host) !== undefined ||
        (marked && !insideReact(host)) ||
        waited >= HYDRATION_BOUND
      ) {
        done()
        return
      }
      setTimeout(look, LOOK_EVERY)
    }
    look()
  })

/*
 * Binds the handler React is holding for this event, if it has not bound it.
 *
 * **React attaches no custom element listener while hydrating.** Measured in
 * Chromium on every 19 release in the range above, and reported in
 * facebook/react#35446, still open on October 25, 2026, with its fix
 * (facebook/react#37797) unmerged: on a server-rendered page every `onhelix-*` prop is
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
 * getting it wrong doubles every call.** Measured against React 19.3.1 on
 * October 25, 2026, on a client mount, as it was on 19.2.8 before it:
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
 * bound. In a development build the props are audited on the way, so a
 * handler attached to nothing warns; see `react-audit.ts`.
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
