import '@fusion.dev/helix-testing/dom/register'
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
       rather than this library's event. A rename must not sweep the input. */
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
  /* React recognizes `onError` and `onLoad` as its own and attaches nothing to
     a custom element for either: the delegated listener at the root sees only
     what bubbles, and the non-delegated list it sets up for `<video>` and
     `<img>` is never set up for a custom element. Avatar relays `load` and
     `error`, Video relays `ended`, `play` and `pause`, and none of the five
     reaches React on its own. */
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

  /* `play`, `pause` and `ended` relayed with `bubbles: true` land in the one
     branch that refuses to bind, so they reach nothing in React. Both
     directions are asserted, because the fix is a propagation flag and a test
     of only the working half would pass against the bug. */
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

  /* React binds `ontoggle` and `onchange` on the element itself, by the name
     after `on`, on a client mount, and binds nothing while hydrating: the
     lowercase spelling the typings offer was dead on a hydrated page. */
  test.each([
    ['toggle', false],
    ['change', true],
  ])('the lowercase spelling of %s is bound once, whatever its bubbling', (type, bubbles) => {
    let calls = 0
    const handler = (): void => {
      calls += 1
    }
    const element = hydrated({ [`on${type}`]: handler })

    element.dispatchEvent(new Event(type, { bubbles }))
    // React's own binding on a later commit is the same callback, and adds nothing.
    element.addEventListener(type, handler)
    element.dispatchEvent(new Event(type, { bubbles }))

    expect(calls).toBe(2)
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
    /* The host is the element React owns, so an attribute mark is a hydration
       mismatch: a definition landing during module evaluation has a frame to
       spend before React arrives, and the element writes onto itself before
       React hydrates the DOM the server wrote. Deferring the import moves the
       frame past hydration and fixes one route rather than the cause, which is
       that private bookkeeping was being kept where React reconciles. */
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
 * these assert *when* as much as *whether*, and the first two tests are the
 * ones that fail if the assignment is ever moved later than the first render.
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

  /**
   * The mark `createRoot` and `hydrateRoot` leave on the document before React
   * renders anything, and so before any node there holds props.
   */
  const ROOT_MARK = '_reactListening8d1f'

  afterEach(() => {
    delete (document as unknown as Record<string, unknown>)[ROOT_MARK]
  })

  /** Upgraded before the bag arrives: a definition evaluated with the bundle. */
  const early = (element: Carrier, props: Record<string, unknown>): void => {
    Object.assign(document, { [ROOT_MARK]: true })
    Object.assign(element, { __reactProps$k9x2: props })
  }

  /** Counts the timers booked at `LOOK_EVERY` while `run` runs. */
  const lookTimers = async (run: () => Promise<void>): Promise<number> => {
    const original = globalThis.setTimeout
    let booked = 0
    globalThis.setTimeout = ((handler: () => void, delay?: number) => {
      booked += delay === 16 ? 1 : 0
      return original(handler, delay)
    }) as typeof setTimeout
    try {
      await run()
    } finally {
      globalThis.setTimeout = original
    }
    return booked
  }

  test('is assigned by the first update, because a property has to be right before the paint', async () => {
    const rows = [{ name: 'Ada Okonjo' }]
    const element = late({ rows })
    await element.updateComplete
    expect(element.rows).toBe(rows)
  })

  /* **In the first render, and with no second update after it.** Assigned from
     `firstUpdated`, the value scheduled an update as the first one finished,
     which Lit's development build reports as `change-in-update`: Command's
     `filterMatch` and Chat Composer's `placeholders` did in a desktop app.
     `updateComplete` resolves `false` while another update is pending. */
  test('is rendered by the first update, with no update after it', async () => {
    const rows = [{ name: 'Ines Duarte' }]
    const element = late({ rows })
    expect(await element.updateComplete).toBe(true)
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

  /* **The frame that one look was short of.** Measured on a project scaffolded
     by `helix new --template react-nextjs`, under `next dev` and under
     `next build && next start`, five runs each: React commits its props on the
     second frame after the first update, so the single look a frame in found
     nothing every time and a data table drew its empty state over data sitting
     on the node.

     The looking after that first frame is on a timer rather than a frame, which
     is what `LOOK_EVERY` is about, so this waits on one. */
  test('is assigned when React commits after the frame the first look was on', async () => {
    const rows = [{ name: 'Cai Wen' }]
    const element = document.createElement(carrier) as Carrier
    document.body.append(element)
    await element.updateComplete
    await frame()
    expect(element.rows).toEqual([])

    early(element, { rows })
    await new Promise((done) => setTimeout(done, 60))
    await element.updateComplete

    expect(element.rows).toBe(rows)
  })

  /* **The App Router ordering, with the root as late as the bag.** The element
     upgrades and draws before React has a root on the page, and `hydrateRoot`
     marks the document only as it starts, frames later. The looking after the
     first frame is what finds the bag then. */
  test('is assigned when React makes its root after the first frame', async () => {
    const rows = [{ name: 'Dara Mbeki' }]
    const element = document.createElement(carrier) as Carrier
    document.body.append(element)
    await element.updateComplete
    await frame()
    await new Promise((done) => setTimeout(done, 30))
    expect(element.rows).toEqual([])

    early(element, { rows })
    await new Promise((done) => setTimeout(done, 40))
    await element.updateComplete

    expect(element.rows).toBe(rows)
  })

  /* **One timer for every element still looking.** Each element booked six of
     its own, so 1,000 buttons booked 6,000 timers and scanned their own keys at
     each. One list is looked at on each tick now, and the ticks stop with the
     last element's window. */
  test('is looked for by one timer, however many elements wait', async () => {
    Object.assign(document, { [ROOT_MARK]: true })
    const elements = Array.from({ length: 20 }, () => {
      const element = document.createElement(carrier) as Carrier
      document.body.append(element)
      return element
    })
    const booked = await lookTimers(async () => {
      await Promise.all(elements.map((element) => element.updateComplete))
      await frame()
      await new Promise((done) => setTimeout(done, 200))
    })

    expect(booked).toBeGreaterThan(0)
    expect(booked).toBeLessThan(10)
    expect(await lookTimers(() => new Promise((done) => setTimeout(done, 60)))).toBe(0)
  })

  /* **A page without React books its ticks and scans no element.** React marks
     the document before any node holds props, so an element in a document
     without the mark has nothing to find, and does not look. A bag never sits
     on a node of such a page; the one written here only shows that nothing
     read it. */
  test('is not looked for in a document React has no root in', async () => {
    const rows = [{ name: 'Eun-ji Park' }]
    const element = document.createElement(carrier) as Carrier
    document.body.append(element)
    await element.updateComplete
    await frame()

    Object.assign(element, { __reactProps$k9x2: { rows } })
    await new Promise((done) => setTimeout(done, 60))
    await element.updateComplete

    expect(element.rows).toEqual([])
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

describe('usage', () => {
  const slot = Symbol.for('fusion.dev/helix/usage')
  const store = globalThis as Record<symbol, unknown>

  afterEach(() => {
    delete store[slot]
  })

  test('an element tells the listener once, after its first render', async () => {
    const told: Element[] = []
    store[slot] = (element: Element) => told.push(element)
    const element = document.createElement(tag) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    document.body.append(element)
    await element.updateComplete
    element.setAttribute('data-again', '')
    await element.updateComplete
    expect(told).toHaveLength(1)
    expect(told[0]).toBe(element)
  })

  test('with no listener, an element renders as it always did', async () => {
    const element = document.createElement(tag) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    document.body.append(element)
    expect(await element.updateComplete).toBe(true)
  })

  test('a listener that throws breaks neither the element nor the page, and is printed once', async () => {
    store[slot] = () => {
      throw new Error('listener')
    }
    const printed: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => {
      printed.push(args)
    }
    try {
      for (let at = 0; at < 2; at += 1) {
        const element = document.createElement(tag) as HTMLElement & {
          updateComplete: Promise<boolean>
        }
        document.body.append(element)
        expect(await element.updateComplete).toBe(true)
      }
    } finally {
      console.error = original
    }
    expect(printed).toHaveLength(1)
    expect(String(printed[0]?.[0])).toContain('a usage listener threw')
  })
})

describe('render', () => {
  const slot = Symbol.for('fusion.dev/helix/render')
  const store = globalThis as Record<symbol, unknown>

  afterEach(() => {
    delete store[slot]
  })

  test('an element tells the listener how long its first update took, and only that one', async () => {
    const told: Array<{ duration: number; element: Element; start: number }> = []
    store[slot] = (element: Element, measure: { duration: number; start: number }) =>
      told.push({ element, ...measure })
    const before = performance.now()
    const element = document.createElement(tag) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    document.body.append(element)
    await element.updateComplete
    element.setAttribute('data-again', '')
    await element.updateComplete
    expect(told).toHaveLength(1)
    expect(told[0]?.element).toBe(element)
    expect(told[0]?.start).toBeGreaterThanOrEqual(before)
    expect(told[0]?.duration).toBeGreaterThanOrEqual(0)
  })

  test('a listener that throws breaks no element, and is printed once', async () => {
    store[slot] = () => {
      throw new Error('listener')
    }
    const printed: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => {
      printed.push(args)
    }
    try {
      for (let at = 0; at < 2; at += 1) {
        const element = document.createElement(tag) as HTMLElement & {
          updateComplete: Promise<boolean>
        }
        document.body.append(element)
        expect(await element.updateComplete).toBe(true)
      }
    } finally {
      console.error = original
    }
    expect(printed).toHaveLength(1)
    expect(String(printed[0]?.[0])).toContain('a render listener threw')
  })
})

describe('version', () => {
  test('a loaded copy of core lists its version on the page once', async () => {
    const { VERSION } = await import('../version.js')
    const { noteVersion } = await import('../utils/report-usage/report-usage.js')
    noteVersion()
    const listed = (globalThis as Record<symbol, unknown>)[Symbol.for('fusion.dev/helix/versions')]
    expect(listed).toEqual([VERSION])
  })
})

describe('a composed tag', () => {
  test('is the value unsafeStatic makes, so a static template renders the element of the tier', async () => {
    const { HelixElement } = await import('./helix-element.js')
    const { html, unsafeStatic } = await import('lit/static-html.js')
    const { render } = await import('lit')
    class Composer extends HelixElement {
      static override tier = 'helix-'
      composed(name: string) {
        return this.tag(name)
      }
    }
    customElements.define('probe-composer', Composer)
    const composer = document.createElement('probe-composer') as Composer
    const value = composer.composed('select')
    expect(value).toEqual(unsafeStatic('helix-select'))
    const into = document.createElement('div')
    render(html`<${value} id="made"></${value}>`, into)
    expect(into.querySelector('#made')?.localName).toBe('helix-select')
  })

  /* The bundle half of the same promise: a runtime import of
     `lit/static-html.js` here keeps its `withStatic` calls in every family. */
  test('is made without importing static-html at run time', async () => {
    const source = await Bun.file(new URL('./helix-element.ts', import.meta.url)).text()
    const imports = source.split('\n').filter((line) => line.includes("'lit/static-html.js'"))
    expect(imports).toEqual(["import type { StaticValue } from 'lit/static-html.js'"])
  })
})

describe('the rules every shadow root gets', () => {
  /** The text of the sheet `finalizeStyles` puts first, for a class. */
  const first = (element: unknown): string =>
    (element as { elementStyles: Array<{ cssText?: string }> }).elementStyles[0]?.cssText ?? ''

  test('are box-sizing, hidden and settled, with no mark rule', async () => {
    const { HelixElement } = await import('./helix-element.js')
    class Plain extends HelixElement {}
    customElements.define('probe-plain-marks', Plain)
    const text = first(Plain)
    expect(text).toContain('box-sizing:border-box')
    expect(text).toContain(":host([hidden]:not([hidden='until-found']))")
    expect(text).toContain(':state(settled)')
    expect(text).not.toContain('data-')
  })

  /* Between `HIDDEN` and `SETTLED`, which is where all four sat when every
     shadow root carried them, so the cascade is the one it was. */
  test('and the rules a class names for its marks, before settled', async () => {
    const { HelixElement } = await import('./helix-element.js')
    const { MIRROR_RULE, SCROLLER_RULE } = await import('./mark-rules.js')
    class Marked extends HelixElement {
      protected static override markRules = [SCROLLER_RULE, MIRROR_RULE]
    }
    class Inherited extends Marked {}
    customElements.define('probe-marked', Marked)
    customElements.define('probe-marked-inherited', Inherited)
    for (const one of [Marked, Inherited]) {
      const text = first(one)
      expect(text.indexOf('until-found')).toBeLessThan(text.indexOf(SCROLLER_RULE))
      expect(text.indexOf(SCROLLER_RULE)).toBeLessThan(text.indexOf(MIRROR_RULE))
      expect(text.indexOf(MIRROR_RULE)).toBeLessThan(text.indexOf(':state(settled)'))
    }
  })
})
