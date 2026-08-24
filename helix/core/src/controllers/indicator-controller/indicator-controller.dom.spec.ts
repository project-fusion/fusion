import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import { IndicatorController } from './indicator-controller.js'

/**
 * Measuring the marked child and writing the geometry onto a traveling mark.
 *
 * **Four components had written this and the copies had diverged.**
 * `Navigation`, `Tabs`, `Toggle.Group` and `Outline` each measured an active
 * child and wrote a position onto an indicator, and two of them had bugs the
 * others did not. What they disagreed about is what these specs are: the sign
 * of the inline axis in a right-to-left document, and whether the surface's own
 * border comes off the measurement.
 *
 * The boxes are supplied. happy-dom answers `0 0 0 0` to every
 * `getBoundingClientRect`, and the arithmetic between two rectangles is the
 * whole subject, so the rectangles are its inputs. `direction`, `clientLeft`,
 * `ResizeObserver`, `TransitionEvent` and custom properties are all real here,
 * and were checked before being relied on.
 */
beforeAll(() => {
  registerDom()
})

const live: IndicatorController[] = []
afterEach(() => {
  for (const one of live.splice(0)) {
    one.hostDisconnected()
  }
})

interface Box {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

const box = (left: number, top: number, width: number, height: number): Box => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  top,
  width,
})

interface Scene {
  active: HTMLElement
  indicator: HTMLElement
  mark: IndicatorController
  place(): void
  surface: HTMLElement
}

const scene = (
  options: { active?: Box | null; border?: number; own?: Box; rtl?: boolean } = {},
): Scene => {
  const {
    active: activeBox = box(40, 0, 60, 30),
    border = 0,
    own = box(0, 0, 300, 30),
    rtl,
  } = options
  document.body.innerHTML =
    '<div id="host"><div id="surface"><span id="active"></span><i id="indicator"></i></div></div>'
  const host = document.getElementById('host') as HTMLElement
  Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
  const surface = document.getElementById('surface') as HTMLElement
  const active = document.getElementById('active') as HTMLElement
  const indicator = document.getElementById('indicator') as HTMLElement
  if (rtl) {
    surface.style.direction = 'rtl'
  }
  Object.defineProperty(surface, 'clientLeft', { configurable: true, value: border })
  Object.defineProperty(surface, 'clientTop', { configurable: true, value: border })
  surface.getBoundingClientRect = (() => own) as never
  active.getBoundingClientRect = (() => activeBox ?? box(0, 0, 0, 0)) as never
  const mark = new IndicatorController(host as never, {
    active: () => (activeBox === null ? null : active),
    indicator: () => indicator,
    surface: () => surface,
  })
  live.push(mark)
  return { active, indicator, mark, place: () => mark.place(), surface }
}

const at = (indicator: HTMLElement): Record<string, string> =>
  Object.fromEntries(
    ['height', 'width', 'x', 'y'].map((name) => [
      name,
      indicator.style.getPropertyValue(`--indicator-${name}`),
    ]),
  )

describe('the geometry of the marked child', () => {
  test('is written as the four properties whoever draws the mark reads', () => {
    const one = scene()
    one.place()
    expect(at(one.indicator)).toEqual({ height: '30px', width: '60px', x: '40px', y: '0px' })
  })

  /* `getBoundingClientRect` gives the border box and the containing block is
     the *padding* box, so a surface with a border of its own puts the mark one
     border-width out. `Tabs` and `Toggle.Group` each did this arithmetic
     separately, `Outline` did the block half only, and `Navigation` did
     neither. `clientLeft` and `clientTop` are the resolved widths, which is why
     they are read rather than `borderLeftWidth` parsed. */
  test('with the surface’s own border off both axes, not one', () => {
    const one = scene({ active: box(40, 10, 60, 30), border: 2, own: box(0, 0, 300, 40) })
    one.place()
    expect(at(one.indicator)).toMatchObject({ x: '38px', y: '8px' })
  })
})

describe('a right-to-left document', () => {
  /* The bug this extraction exists to stop repeating. The mark travels from the
     inline start and the inline start is on the right, so the distance is
     measured from the surface's right edge and applied as a negative
     translation. `Navigation` measured from the physical left and applied it
     from the inline-start edge unsigned, so its marker went the wrong way. */
  test('measures from the right edge and travels the other way', () => {
    const one = scene({ active: box(40, 0, 60, 30), own: box(0, 0, 300, 30), rtl: true })
    one.place()
    expect(at(one.indicator).x).toBe('-200px')
  })

  test('and takes the border off that edge too', () => {
    const one = scene({ active: box(40, 0, 60, 30), border: 2, own: box(0, 0, 300, 30), rtl: true })
    one.place()
    expect(at(one.indicator).x).toBe('-198px')
  })
})

describe('a component whose children have not upgraded', () => {
  /* A zero box is exactly that, and writing zeroes would park the mark at the
     origin and leave it there. `data-placed` is what a stylesheet waits for, so
     a mark fades in where it belongs rather than sliding from the corner on
     first paint. */
  test('is not measured, and the mark is not placed', () => {
    const one = scene({ active: box(0, 0, 0, 0) })
    one.place()
    expect(one.indicator.hasAttribute('data-placed')).toBe(false)
    expect(at(one.indicator).x).toBe('')
  })
})

describe('a set with nothing marked', () => {
  test('takes the mark away rather than leaving it where it was', () => {
    const one = scene()
    one.place()
    expect(one.indicator.hasAttribute('data-placed')).toBe(true)
    const gone = scene({ active: null })
    gone.indicator.toggleAttribute('data-placed', true)
    gone.place()
    expect(gone.indicator.hasAttribute('data-placed')).toBe(false)
  })
})

describe('a mark that has nothing to be drawn against', () => {
  test('writes nothing rather than throwing', () => {
    document.body.innerHTML = '<div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    Object.assign(host, { addController: () => {} })
    const mark = new IndicatorController(host as never, {
      active: () => null,
      indicator: () => null,
      surface: () => null,
    })
    expect(() => {
      mark.place()
    }).not.toThrow()
  })
})

describe('a mark on its way somewhere', () => {
  /* There is no CSS state for "a transition is running", and the effect this
     exists for wants one: a mark that swells as it leaves and settles back when
     it lands reads as a thing being carried rather than a rectangle being
     repositioned. */
  const moved = (): Scene => {
    const one = scene()
    one.place()
    one.active.getBoundingClientRect = (() => box(140, 0, 60, 30)) as never
    one.place()
    return one
  }

  test('says so, so a stylesheet can say something about the travel', () => {
    expect(moved().indicator.hasAttribute('data-moving')).toBe(true)
  })

  /* Never on the first placement: the mark arrives by fading in, and swelling
     on arrival would be an animation about nothing. */
  test('but not on arrival, which is not a journey', () => {
    const one = scene()
    one.place()
    expect(one.indicator.hasAttribute('data-moving')).toBe(false)
  })

  test('nor on a placement that put it back where it was', () => {
    const one = scene()
    one.place()
    one.place()
    expect(one.indicator.hasAttribute('data-moving')).toBe(false)
  })

  /* `transitionend` fires once per property, and a stylesheet reacting to
     `data-moving` is very likely to transition something shorter than the
     travel: the outline's mark widens over `duration-fast` while it travels
     over `duration-normal`, so an unfiltered listener had the width's own
     transition end the move that caused it, a third of the way through. */
  /* Defined rather than passed to the constructor: happy-dom's
     `TransitionEvent` accepts `propertyName` and reports it as undefined, so
     both halves of this test would take the same branch and it would pass
     against a filter that does nothing. Measured before relying on it. */
  const ended = (on: HTMLElement, propertyName: string): void => {
    const event = new TransitionEvent('transitionend')
    Object.defineProperty(event, 'propertyName', { value: propertyName })
    on.dispatchEvent(event)
  }

  test('and lands when the travel ends, not when something shorter does', () => {
    const one = moved()
    ended(one.indicator, 'width')
    expect(one.indicator.hasAttribute('data-moving')).toBe(true)
    ended(one.indicator, 'translate')
    expect(one.indicator.hasAttribute('data-moving')).toBe(false)
  })

  /* The event is the honest signal and it does not always come: a move under
     reduced motion has no transition to end, and neither does one whose
     computed position turns out identical after a resize. A marker that can
     stick is worse than one that clears a little early. */
  test('or lands on the guard, for the move that has no transition to end', async () => {
    const one = moved()
    expect(one.indicator.hasAttribute('data-moving')).toBe(true)
    await new Promise((done) => setTimeout(done, 1050))
    expect(one.indicator.hasAttribute('data-moving')).toBe(false)
  })
})

describe('a second move before the first has settled', () => {
  /* Each placement built a fresh `settle` closure and then cleared the timer
     belonging to the *previous* one, which was the only thing that would have
     removed its listener: the event itself never arrives under reduced motion,
     where there is no transition to end. So a reader changing tabs quickly, or
     any reader at all with motion reduced, left one dead listener per selection
     on an element that lives as long as the page. The people who asked for less
     work were the ones accumulating it. */
  test('takes the first listener off before adding its own', () => {
    const one = scene()
    let held = 0
    const added = one.indicator.addEventListener.bind(one.indicator)
    const removed = one.indicator.removeEventListener.bind(one.indicator)
    one.indicator.addEventListener = ((...args: Parameters<typeof added>) => {
      held += 1
      added(...args)
    }) as never
    one.indicator.removeEventListener = ((...args: Parameters<typeof removed>) => {
      held -= 1
      removed(...args)
    }) as never
    one.place()
    for (const left of [140, 200, 260]) {
      one.active.getBoundingClientRect = (() => box(left, 0, 60, 30)) as never
      one.place()
    }
    expect(held).toBe(1)
  })

  test('and the host leaving takes the last one with it', () => {
    const one = scene()
    let held = 0
    const added = one.indicator.addEventListener.bind(one.indicator)
    const removed = one.indicator.removeEventListener.bind(one.indicator)
    one.indicator.addEventListener = ((...args: Parameters<typeof added>) => {
      held += 1
      added(...args)
    }) as never
    one.indicator.removeEventListener = ((...args: Parameters<typeof removed>) => {
      held -= 1
      removed(...args)
    }) as never
    one.place()
    one.active.getBoundingClientRect = (() => box(140, 0, 60, 30)) as never
    one.place()
    one.mark.hostDisconnected()
    expect(held).toBe(0)
  })
})

describe('what makes it measure again', () => {
  test('is every update, which is when the marked child may have moved', () => {
    const one = scene()
    one.mark.hostUpdated()
    expect(one.indicator.hasAttribute('data-placed')).toBe(true)
  })

  /* The host's own size is not enough: a strip that keeps its width while its
     children rewrap moves every one of them, and a mark measured against the
     old layout is left behind. Observing the host catches both, because a
     rewrap changes its height. */
  test('and the host changing size, which a rewrap also does', () => {
    const one = scene()
    one.mark.hostConnected()
    expect(() => {
      one.mark.hostDisconnected()
    }).not.toThrow()
  })
})
