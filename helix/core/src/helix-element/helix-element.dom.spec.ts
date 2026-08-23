import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

const tag = 'probe-element'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('./helix-element.js')
  customElements.define(tag, class extends HelixElement {})
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
      'onhelix-open': () => {
        calls += 1
      },
    })

    element.dispatchEvent(new CustomEvent('helix-open'))

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
    const element = hydrated({ 'onhelix-open': handler })

    element.dispatchEvent(new CustomEvent('helix-open'))
    element.addEventListener('helix-open', handler)
    element.dispatchEvent(new CustomEvent('helix-open'))

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
    const element = hydrated({ 'onhelix-open': first })

    element.dispatchEvent(new CustomEvent('helix-open'))
    element.removeEventListener('helix-open', first)
    element.addEventListener('helix-open', second)
    Object.assign(element, { __reactProps$k9x2: { 'onhelix-open': second } })
    element.dispatchEvent(new CustomEvent('helix-open'))

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

    expect(() => element.dispatchEvent(new CustomEvent('helix-open'))).not.toThrow()
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

    element.dispatchEvent(new CustomEvent('helix-open'))

    expect(warnings[0]).toContain('onhelix-opne')
    expect(warnings[0]).toContain('nothing dispatches')
  })

  test("Solid's `on:` form is called what it is, rather than reported as a typo", () => {
    const element = hydrated({ 'on:helix-open': () => {} })

    element.dispatchEvent(new CustomEvent('helix-open'))

    expect(warnings[0]).toContain("Solid's syntax")
    expect(warnings[0]).toContain('onhelix-open')
  })

  test('a removed callback property says it was removed', () => {
    const element = hydrated({ onCheckedChange: () => {} })

    element.dispatchEvent(new CustomEvent('helix-change'))

    expect(warnings[0]).toContain('onCheckedChange')
    expect(warnings[0]).toContain('removed')
  })

  test('a correct prop says nothing at all', () => {
    const element = hydrated({ 'onhelix-open': () => {} })

    element.dispatchEvent(new CustomEvent('helix-open'))

    expect(warnings).toEqual([])
  })

  test('says it once, not on every keystroke', () => {
    const element = hydrated({ 'onhelix-opne': () => {} })

    element.dispatchEvent(new CustomEvent('helix-open'))
    element.dispatchEvent(new CustomEvent('helix-open'))
    element.dispatchEvent(new CustomEvent('helix-open'))

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

  test('is absent through the first update, so an arriving sheet has nothing to transition', async () => {
    const element = document.createElement(tag) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    document.body.append(element)
    await element.updateComplete
    expect(element.hasAttribute('data-settled')).toBe(false)
  })

  test('lands a frame later, by which point the resting value is already resolved', async () => {
    const element = document.createElement(tag) as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    document.body.append(element)
    await element.updateComplete
    await frame()
    expect(element.hasAttribute('data-settled')).toBe(true)
  })
})
