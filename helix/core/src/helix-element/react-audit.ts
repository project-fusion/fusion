import { eventsForTag } from '../events/element-events.js'
import { helixEventNames } from '../events/names.js'
import { reportRuntime } from '../utils/report-runtime/report-runtime.js'

/*
 * The React prop audit: a warning for a handler prop attached to nothing.
 *
 * **In a development build only**, as `missing-name` is. It is the part of the
 * React bridge that tells the person writing the page about a mistake, and
 * none of it makes React work: binding the handlers and assigning the
 * properties React dropped stay in `react-bridge.ts`, in every build. Core
 * imports this as `#react-audit`, which `package.json` resolves here under the
 * `development` condition and to `react-audit-off.ts`, which does nothing,
 * everywhere else. Every element paid for it before, about 920 bytes gzip of
 * sentences and the list of every event name (measured on Switch, Button,
 * Badge and five more, October 6, 2026), in a production bundle where nobody
 * reads the console.
 */

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
 * bag as the only place to look, which the bridge already reads. Once per
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

/**
 * The prefix of the mark React leaves on the node it makes a root in.
 *
 * `createRoot` and `hydrateRoot` write it and a random suffix on their
 * container, which is the document itself on a Next.js App Router page and a
 * `<div>` everywhere else. Read from the source of 17.0.2 and 18.2.0 and from
 * react-dom 19.3.1, as the bridge's own two marks were.
 */
const REACT_CONTAINER = '__reactContainer$'

/** The root marks of the pages already told that no element found React's props. */
const told = new Set<string>()

/** Whether a node is in the tree React renders into, its root's container or below it. */
const insideReact = (host: Node): boolean => {
  for (let node: Node | null = host.parentNode; node !== null; node = node.parentNode) {
    if (Object.keys(node).some((key) => key.startsWith(REACT_CONTAINER))) {
      return true
    }
  }
  return false
}

/**
 * Says so when React has a root on the page and no element found its props.
 *
 * **The bridge's one silent failure.** It finds React's props by a prefix of
 * React's own, so the day React renames that key every `onhelix-*` handler on
 * a server-rendered page is dead again, and every object property a server
 * dropped stays unset, with nothing in the console. The bridge calls this for
 * an element whose window closed in a document carrying React's root mark,
 * where no element has found a props bag, with the window it looked for and
 * the mark, whose suffix is that React's own.
 *
 * **Only for an element React renders.** It has to sit in the document's own
 * tree, never in a shadow root, which is where Lit renders most of this
 * library's elements and where React holds nothing, and under the node React
 * made its root in. A page whose React island renders no Helix element keeps
 * its static ones outside that node, and is told nothing.
 *
 * **An error, once a page.** It means the elements cannot work with the React
 * installed, which is a failure of the page rather than advice, and it is
 * printed as `console.error` so a run that fails on the console fails here.
 */
export const auditReactMissing = (host: Node, window: number, mark: string): void => {
  if (told.has(mark) || host.getRootNode() !== host.ownerDocument || !insideReact(host)) {
    return
  }
  told.add(mark)
  reportRuntime({
    kind: 'react-props-missing',
    level: 'error',
    message:
      `React has a root on this page, and no Helix element found the props React holds for it ` +
      `within ${window} ms. Helix reads them under a key starting \`__reactProps$\`, and this ` +
      'React no longer writes one. `onhelix-*` handlers on a server-rendered page will not run, and ' +
      'object properties the server could not write will not arrive. Pin React to a version in the ' +
      'range https://fusion.dev/helix/docs/using-the-elements states, and report the one installed.',
    tag: host instanceof Element ? host.localName : undefined,
  })
}
