import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

const tag = 'probe-element'

/** A probe declaring the shapes React cannot hand over. See `carried`. */
const carrier = 'carrier-element'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('./helix-element.js')
  customElements.define(tag, class extends HelixElement {})
  customElements.define(
    carrier,
    class extends HelixElement {
      static override properties = {
        cell: { attribute: false },
        label: {},
        rows: { attribute: false },
      }

      cell: unknown = undefined
      label = ''
      rows: unknown = []
    },
  )
})

/**
 * An element with React's props bag on it, as a hydrated page would leave it.
 *
 * The suffix is random per page in React itself, which is why the element
 * discovers the key rather than being told it.
 */
const hydrated = (props: Record<string, unknown>): HTMLElement => {
  const element = document.createElement(tag)
  document.body.append(element)
  Object.assign(element, { __reactProps$k9x2: props })
  return element
}

describe('the handler React is holding', () => {
  test('is bound before the event goes out, because hydration never bound it', () => {
    let calls = 0
    const element = hydrated({
      'onhelix-before-open': () => {
        calls += 1
      },
    })

    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(calls).toBe(1)
  })

  /* The whole safety argument in one test. The raw prop function is what gets
     bound, so React adding it again is a no-op by specification and React
     removing it on its next commit matches ours exactly. A wrapper around the
     handler would satisfy neither, and every consumer would get two calls per
     event from the first commit onward. */
  test('fires once per event, not twice, once React has bound it too', () => {
    let calls = 0
    const handler = (): void => {
      calls += 1
    }
    const element = hydrated({ 'onhelix-before-open': handler })

    element.dispatchEvent(new CustomEvent('helix-before-open'))
    element.addEventListener('helix-before-open', handler)
    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(calls).toBe(2)
  })

  /* The handover, written the way React performs it: on a commit it removes the
     handler it was previously holding, which is the one this bound, and adds
     the new one. Nothing here has to clean up after itself, and nothing is left
     behind to fire beside the current handler. */
  test('is replaced, not accumulated, when React commits a new one', () => {
    const seen: string[] = []
    const first = (): number => seen.push('first')
    const second = (): number => seen.push('second')
    const element = hydrated({ 'onhelix-before-open': first })

    element.dispatchEvent(new CustomEvent('helix-before-open'))
    element.removeEventListener('helix-before-open', first)
    element.addEventListener('helix-before-open', second)
    Object.assign(element, { __reactProps$k9x2: { 'onhelix-before-open': second } })
    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(seen).toEqual(['first', 'second'])
  })

  test('is left alone for a relayed native event, which React binds itself', () => {
    let calls = 0
    const element = hydrated({
      onchange: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event('change'))

    expect(calls).toBe(0)
  })

  test('is not looked for when React is not on the page', () => {
    const element = document.createElement(tag)
    document.body.append(element)

    expect(() => element.dispatchEvent(new CustomEvent('helix-before-open'))).not.toThrow()
  })
})

describe('a handler prop attached to nothing', () => {
  /* TypeScript cannot see any of these: a JSX attribute whose name is not a
     valid identifier is exempt from checking on an intrinsic element, and every
     Helix event prop carries a hyphen. Runtime is the only place left. */
  const warnings: string[] = []
  const real = console.warn

  beforeEach(() => {
    warnings.length = 0
    console.warn = (message: string) => warnings.push(message)
  })

  afterEach(() => {
    console.warn = real
  })

  test('a misspelled event name is named, along with what nothing dispatches', () => {
    const element = hydrated({ 'onhelix-opne': () => {} })

    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(warnings[0]).toContain('onhelix-opne')
    expect(warnings[0]).toContain('nothing dispatches')
  })

  test("Solid's `on:` form is called what it is, rather than reported as a typo", () => {
    const element = hydrated({ 'on:helix-open': () => {} })

    element.dispatchEvent(new CustomEvent('helix-before-open'))

    /* `onhelix-open`, not `onhelix-before-open`: the warning echoes the prop it
       was given, and `on:helix-open` is a stand-in for any Solid-shaped name
       rather than this library's event. A rename swept the expectation and not
       the input, which is the one shape a global rename gets wrong. */
    expect(warnings[0]).toContain("Solid's syntax")
    expect(warnings[0]).toContain('onhelix-open')
  })

  test('a removed callback property says it was removed', () => {
    const element = hydrated({ onCheckedChange: () => {} })

    element.dispatchEvent(new CustomEvent('helix-before-change'))

    expect(warnings[0]).toContain('onCheckedChange')
    expect(warnings[0]).toContain('removed')
  })

  test('a correct prop says nothing at all', () => {
    const element = hydrated({ 'onhelix-before-open': () => {} })

    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(warnings).toEqual([])
  })

  test('says it once, not on every keystroke', () => {
    const element = hydrated({ 'onhelix-opne': () => {} })

    element.dispatchEvent(new CustomEvent('helix-before-open'))
    element.dispatchEvent(new CustomEvent('helix-before-open'))
    element.dispatchEvent(new CustomEvent('helix-before-open'))

    expect(warnings).toHaveLength(1)
  })
})

describe('a relayed native event', () => {
  /* React recognises `onError` and `onLoad` as its own and attaches nothing to
     a custom element for either: the delegated listener at the root sees only
     what bubbles, and the non-delegated list it sets up for `<video>` and
     `<img>` is never set up for a custom element. Avatar relays `load` and
     `error`, Video relays `ended`, `play` and `pause`, and all five were
     silent. */
  test('reaches the prop React uses for it, when nothing else would', () => {
    let calls = 0
    const element = hydrated({
      onError: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event('error'))

    expect(calls).toBe(1)
  })

  /* The other half, and the one that would have made this worse than the bug.
     React's listener for a bubbling native sits at the root rather than on the
     element, so nothing deduplicates a second one bound here and the consumer's
     handler runs twice. `change` is the relay this actually applies to. */
  test('is left alone when it bubbles, because React is already listening', () => {
    let calls = 0
    const element = hydrated({
      onChange: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event('change', { bubbles: true }))

    expect(calls).toBe(0)
  })

  /* The trio the comment beside `reactPropFor` named as fixed while `Video` kept
     them broken: it relayed `play`, `pause` and `ended` with `bubbles: true`,
     which is the one branch that refuses to bind, so all three were silent in
     React. Both directions are asserted, because the fix is a propagation flag
     and a test of only the working half would pass against the bug. */
  test.each([
    ['play', 'onPlay'],
    ['pause', 'onPause'],
    ['ended', 'onEnded'],
  ])('%s reaches %s when it does not bubble, as the platform sends it', (type, prop) => {
    let calls = 0
    const element = hydrated({
      [prop]: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event(type, { bubbles: false, composed: false }))

    expect(calls).toBe(1)
  })

  test.each([
    ['play', 'onPlay'],
    ['pause', 'onPause'],
    ['ended', 'onEnded'],
  ])('%s reaches nothing when it bubbles, which is what %s was doing', (type, prop) => {
    let calls = 0
    const element = hydrated({
      [prop]: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event(type, { bubbles: true, composed: true }))

    expect(calls).toBe(0)
  })

  test('is left alone where React wires the element itself', () => {
    let calls = 0
    const element = hydrated({
      onScroll: () => {
        calls += 1
      },
    })

    element.dispatchEvent(new Event('scroll'))

    expect(calls).toBe(0)
  })
})

/**
 * The mark that releases `SETTLED`, and the timing is the whole of it.
 *
 * A shadow root adopts its stylesheets when the element upgrades, so the first
 * style resolution that sees a component's own sheet is a change and any
 * `transition` it declares runs against the property's initial value. What that
 * looked like in practice was App Header fading a one pixel `currentColor`
 * hairline out on every load, near-white in dark mode.
 *
 * Asserted here rather than by reading a computed style, because the fault is
 * about *when* the attribute lands and happy-dom has no cascade to ask. If this
 * ever moves into `firstUpdated` itself the first test fails, which is the
 * regression worth catching: Lit's upgrade, render and `firstUpdated` share one
 * microtask checkpoint, so an attribute set there lands in the same resolution
 * as the sheets and the transition runs anyway.
 */
describe('the settled mark', () => {
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

  type Settling = HTMLElement & {
    internals: { states: Set<string> }
    whenSettled: Promise<void>
    updateComplete: Promise<unknown>
  }

  const mounted = (): Settling => {
    const element = document.createElement(tag) as Settling
    document.body.append(element)
    return element
  }

  test('is absent through the first update, so an arriving sheet has nothing to transition', async () => {
    const element = mounted()
    await element.updateComplete
    expect(element.internals.states.has('settled')).toBe(false)
  })

  test('lands a frame later, by which point the resting value is already resolved', async () => {
    const element = mounted()
    await element.updateComplete
    await frame()
    expect(element.internals.states.has('settled')).toBe(true)
  })

  test('is a state and never an attribute, which is what hydration reads', async () => {
    /* **The regression this exists for was reported three times as three bugs.**
       The mark was `setAttribute('data-settled', '')` on the host, and the host
       is the element React owns: a definition landing during module evaluation
       has a frame to spend before React arrives, so the element wrote onto
       itself and React then hydrated a DOM that had gained an attribute since
       the server wrote it. Measured at the time across three routes: `/helix`
       clean, `/helix/theme` one and `/helix/sandbox` three.

       Three deferred imports were added to move that frame to the other side of
       hydration. Each fixed a route and none fixed the cause, which is that
       private bookkeeping was being kept where React reconciles. */
    const element = mounted()
    await element.updateComplete
    await frame()
    expect(element.internals.states.has('settled')).toBe(true)
    expect(element.getAttributeNames()).not.toContain('data-settled')
  })

  test('resolves its `whenSettled` promise from the same frame', async () => {
    /* A custom state cannot be observed and an attribute could, so the promise
       is the signal anything waiting on the old attribute now takes.
       `readyToMove` in `@fusion.dev/helix-testing` is the caller this is for. */
    const element = mounted()
    let resolved = false
    void element.whenSettled.then(() => {
      resolved = true
    })
    await element.updateComplete
    expect(resolved).toBe(false)
    await frame()
    await Promise.resolve()
    expect(resolved).toBe(true)
  })
})

/**
 * The properties React holds and never applies, which is the same hydration bug
 * as the handlers above with none of the same escape.
 *
 * A handler only has to exist by the time somebody interacts, so the element
 * binds it at dispatch. A property has to be right before the first paint, so
 * these assert *when* as much as *whether*, and the first test is the one that
 * fails if the assignment is ever moved later than `firstUpdated`.
 */
describe('the object property React is holding', () => {
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

  type Carrier = HTMLElement & {
    cell: unknown
    label: string
    rows: unknown
    updateComplete: Promise<unknown>
  }

  /** Upgraded with the bag already on it: a definition that landed after React. */
  const late = (props: Record<string, unknown>): Carrier => {
    const element = document.createElement(carrier) as Carrier
    Object.assign(element, { __reactProps$k9x2: props })
    document.body.append(element)
    return element
  }

  /** Upgraded before the bag arrives: a definition evaluated with the bundle. */
  const early = (element: Carrier, props: Record<string, unknown>): void => {
    Object.assign(element, { __reactProps$k9x2: props })
  }

  test('is assigned by the first update, because a property has to be right before the paint', async () => {
    const rows = [{ name: 'Ada Okonjo' }]
    const element = late({ rows })
    await element.updateComplete
    expect(element.rows).toBe(rows)
  })

  test('is assigned when it is a function, which is what a formatted cell passes', async () => {
    const cell = (row: Record<string, unknown>): unknown => row.name
    const element = late({ cell })
    await element.updateComplete
    expect(element.cell).toBe(cell)
  })

  /* The other upgrade ordering, and the reason there is a second look at all.
     A definition evaluated with the client bundle is running before React
     hydrates, so the first update finds no bag and the frame is what catches
     it. */
  test('is assigned a frame later when React had not committed by the first update', async () => {
    const rows = [{ name: 'Bo Lindqvist' }]
    const element = document.createElement(carrier) as Carrier
    document.body.append(element)
    await element.updateComplete
    expect(element.rows).toEqual([])

    early(element, { rows })
    await frame()
    await element.updateComplete

    expect(element.rows).toBe(rows)
  })

  /* **The narrowing, and why it is not "apply every prop React is holding".** A
     string reached the element as an attribute the server wrote, so it is
     already correct and re-applying it would be this reaching into a channel
     that is not broken. */
  test('leaves a string alone, that having arrived as an attribute', async () => {
    const element = late({ label: 'People' })
    element.setAttribute('label', 'Objects')
    await element.updateComplete
    expect(element.label).toBe('Objects')
  })

  /* The other half of the narrowing. Without it any JSX prop at all would be
     written onto the element, which is a different component's API surface
     arriving by accident. */
  test('never writes a prop the class did not declare', async () => {
    const element = late({ unknownThing: { deep: true } })
    await element.updateComplete
    expect('unknownThing' in element).toBe(false)
  })

  /* Named in `applyReactProperties` as the one divergence from a client mount.
     React would assign the null; the server dropped it and left the class
     default standing, and reproducing the assignment reproduces only a crash. */
  test('leaves a null alone, so the class default stands rather than the crash', async () => {
    const element = late({ rows: null })
    await element.updateComplete
    expect(element.rows).toEqual([])
  })

  test('is not looked for when React is not on the page', async () => {
    const element = document.createElement(carrier) as Carrier
    document.body.append(element)
    await element.updateComplete
    await frame()
    expect(element.rows).toEqual([])
  })
})
