import { beforeAll, describe, expect, test } from 'bun:test'
import { at, hasLayout, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Tour = HTMLElement & {
  back: () => void
  index: number
  length: number
  next: () => void
  open: boolean
  skip: () => void
  stops: (HTMLElement & { current: boolean; first: boolean; last: boolean })[]
  updateComplete: Promise<boolean>
}

const run = async (open = true): Promise<Tour> => {
  const host = (await mount(
    `<div>
      <button id="one">One</button><button id="two">Two</button><button id="three">Three</button>
      <helix-headless-tour label="Getting started" ${open ? 'open' : ''}>
        <helix-headless-tour-stop for="one">First</helix-headless-tour-stop>
        <helix-headless-tour-stop for="two">Second</helix-headless-tour-stop>
        <helix-headless-tour-stop for="three">Third</helix-headless-tour-stop>
      </helix-headless-tour>
    </div>`,
  )) as HTMLElement
  const tour = host.querySelector('helix-headless-tour') as Tour
  await tour.updateComplete
  return tour
}

describe('a tour', () => {
  test('is a named region, said through internals', async () => {
    const tour = await run()
    expect(tour.hasAttribute('role')).toBe(false)
    expect(role(tour)).toBe('region')
  })

  test('counts the stops it was given', async () => {
    expect((await run()).length).toBe(3)
  })

  test('lights the first one and no other', async () => {
    const tour = await run()
    expect(tour.stops.map((stop) => stop.current)).toEqual([true, false, false])
  })

  test('and none at all while it is closed', async () => {
    /* A closed tour draws nothing, which is what lets the server render one:
       there is no measured state to be wrong about before the first frame. */
    const tour = await run(false)
    expect(tour.stops.map((stop) => stop.current)).toEqual([false, false, false])
  })

  test('tells each stop where it stands in the run', async () => {
    const tour = await run()
    expect(tour.stops.map((stop) => [stop.first, stop.last])).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ])
  })
})

describe('moving through it', () => {
  test('goes on, and says so rather than assuming', async () => {
    const tour = await run()
    let heard: string | undefined
    tour.addEventListener('helix-before-activate', (event) => {
      heard = (event as CustomEvent<{ value: string }>).detail.value
    })
    tour.next()
    await tour.updateComplete
    expect([tour.index, heard]).toEqual([1, '1'])
  })

  test('goes back', async () => {
    const tour = await run()
    tour.next()
    await tour.updateComplete
    tour.back()
    await tour.updateComplete
    expect(tour.index).toBe(0)
  })

  test('has nowhere back to from the first stop', async () => {
    const tour = await run()
    tour.back()
    await tour.updateComplete
    expect(tour.index).toBe(0)
  })

  test('finishes rather than running past the last stop', async () => {
    const tour = await run()
    let done = 0
    tour.addEventListener('helix-complete', () => {
      done += 1
    })
    tour.index = 2
    await tour.updateComplete
    tour.next()
    await tour.updateComplete
    expect([done, tour.open]).toEqual([1, false])
  })

  test('leaving early is a close and not a completion', async () => {
    const tour = await run()
    let done = 0
    let closed = 0
    tour.addEventListener('helix-complete', () => {
      done += 1
    })
    tour.addEventListener('helix-before-close', () => {
      closed += 1
    })
    tour.skip()
    await tour.updateComplete
    expect([done, closed, tour.open]).toEqual([0, 1, false])
  })

  test('a stop asks and the root decides', async () => {
    /* The stop cannot move the tour: it does not know what is after it. It says
       what was pressed and this is where that turns into an index. */
    const tour = await run()
    tour.stops[0]?.dispatchEvent(
      new CustomEvent('helix-tour-ask', {
        bubbles: true,
        composed: true,
        detail: { what: 'next' },
      }),
    )
    await tour.updateComplete
    expect(tour.index).toBe(1)
  })
})

if (hasLayout()) {
  describe('the spotlight', () => {
    test('follows its target when the target changes size', async () => {
      /* Neither the window nor the tour changed, which were the only times it
         measured: a label whose font arrived late left the light where the
         narrower button had been. */
      const tour = await run()
      const target = tour.ownerDocument.getElementById('one') as HTMLElement
      const width = (): number =>
        (part(tour, 'spotlight') as HTMLElement).getBoundingClientRect().width
      const before = width()
      target.style.inlineSize = `${target.getBoundingClientRect().width + 40}px`
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await tour.updateComplete
      expect(width()).toBe(before + 40)
    })

    test('and still does once the tour has been moved', async () => {
      /* A move disconnects, which tears the watch down, and a tour that was
         only reordered does not update to put it back. */
      const tour = await run()
      const parent = tour.parentElement as HTMLElement
      parent.append(tour)
      const target = tour.ownerDocument.getElementById('one') as HTMLElement
      const width = (): number =>
        (part(tour, 'spotlight') as HTMLElement).getBoundingClientRect().width
      const before = width()
      target.style.inlineSize = `${target.getBoundingClientRect().width + 40}px`
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await tour.updateComplete
      expect(width()).toBe(before + 40)
    })

    test('and a stop points at it from outside, not from on top of the target', async () => {
      /* The panel had no offset, so it sat on the target, over the lit margin,
         with its point inside what it pointed at. The rules are what every sheet
         drawing a tour writes: the light is placed by insets, which a static box
         ignores, the UA's margin centers a popover in the window, and an arrow
         with no size has no reach. */
      const sheet = document.createElement('style')
      sheet.textContent = `helix-headless-tour::part(spotlight) { position: fixed }
        helix-headless-tour-stop::part(bubble) { margin: 0 }
        helix-headless-tour-stop::part(arrow) { block-size: 8px; inline-size: 8px; position: absolute }`
      document.head.append(sheet)
      try {
        const tour = await run()
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const light = (part(tour, 'spotlight') as HTMLElement).getBoundingClientRect()
        const panel = (part(at(tour.stops, 0), 'bubble') as HTMLElement).getBoundingClientRect()
        /* The arrow's reach, `8 / sqrt(2)`, give or take the pixel the
           controller rounds its position to. */
        expect(panel.top - light.bottom).toBeGreaterThan(5)
        expect(panel.top - light.bottom).toBeLessThan(7)
      } finally {
        sheet.remove()
      }
    })
  })
}

describe('a stop', () => {
  test('finds its target by id, the way a tooltip does', async () => {
    const tour = await run()
    const stop = at(tour.stops, 1) as unknown as HTMLElement & { target: HTMLElement | null }
    expect(stop.target?.id).toBe('two')
  })

  test('and finds nothing where the id resolves to nothing', async () => {
    const host = (await mount(
      '<helix-headless-tour open><helix-headless-tour-stop for="nowhere">X</helix-headless-tour-stop></helix-headless-tour>',
    )) as Tour
    await host.updateComplete
    const stop = at(host.stops, 0) as unknown as HTMLElement & { target: HTMLElement | null }
    expect(stop.target).toBeNull()
  })
})

/**
 * The order the component audit named against this family: `index` was written
 * before it was announced, so a refusal arrived after the move it was refusing
 * and `preventDefault` did nothing at all. `skip()` and `finish()` did the same
 * with `open`.
 */
describe('moving between stops', () => {
  test('announces before it moves, so a refusal is a refusal', async () => {
    const tour = await run()
    tour.addEventListener('helix-before-activate', (event) => {
      event.preventDefault()
    })
    tour.next()
    await tour.updateComplete
    expect(tour.index).toBe(0)
  })

  test('and moves where nothing refused', async () => {
    const tour = await run()
    const seen: string[] = []
    tour.addEventListener('helix-before-activate', () => {
      seen.push(`heard at ${tour.index}`)
    })
    tour.next()
    await tour.updateComplete
    expect(seen).toEqual(['heard at 0'])
    expect(tour.index).toBe(1)
  })
})

describe('a tour whose stop the consumer owns', () => {
  /* Declaring `index` seeds the tour rather than claiming it. Control is an
     action: the move applies, and a consumer refuses it by taking the decision.
 */
  test('announces and moves, a declared index being a seed', async () => {
    /* Three stops and starting on the first, because `next()` on the last stop
       is a completion rather than a move and announces nothing at all. */
    const host = (await mount(
      `<helix-headless-tour open index="0">
        <helix-headless-tour-stop for="a">A</helix-headless-tour-stop>
        <helix-headless-tour-stop for="b">B</helix-headless-tour-stop>
        <helix-headless-tour-stop for="c">C</helix-headless-tour-stop>
      </helix-headless-tour>`,
    )) as Tour
    await host.updateComplete
    let heard = 0
    host.addEventListener('helix-before-activate', () => {
      heard += 1
    })
    host.next()
    await host.updateComplete
    expect([heard, host.index]).toEqual([1, 1])
  })

  /* Decided once, at the first update. A script assigning `index` to a tour
     nobody owns would otherwise hand it to a consumer who never asked. */
  test('while a later assignment does not take an unowned tour over', async () => {
    const tour = await run()
    tour.index = 1
    await tour.updateComplete
    tour.next()
    await tour.updateComplete
    expect(tour.index).toBe(2)
  })

  test('and `default-index` seeds without claiming it', async () => {
    const host = (await mount(
      `<helix-headless-tour open default-index="1">
        <helix-headless-tour-stop for="a">A</helix-headless-tour-stop>
        <helix-headless-tour-stop for="b">B</helix-headless-tour-stop>
      </helix-headless-tour>`,
    )) as Tour
    await host.updateComplete
    expect(host.index).toBe(1)
  })
})

describe('leaving the run', () => {
  /* Only one of the two ways out is a request. `HelixBeforeCloseEvent` is
     `cancelable: true` and `HelixCompleteEvent` is not, deliberately: leaving
     early is something a consumer may refuse, and having finished is something
     that has already happened. */
  test('is cancelable when the reader is leaving early', async () => {
    const tour = await run()
    tour.addEventListener('helix-before-close', (event) => {
      event.preventDefault()
    })
    tour.skip()
    await tour.updateComplete
    expect(tour.open).toBe(true)
  })

  test('and closes where nothing refused', async () => {
    const tour = await run()
    tour.skip()
    await tour.updateComplete
    expect(tour.open).toBe(false)
  })

  test('while finishing is a report, and announces before it closes', async () => {
    const tour = await run()
    let openWhenHeard: boolean | undefined
    tour.addEventListener('helix-complete', () => {
      openWhenHeard = tour.open
    })
    tour.index = 2
    tour.next()
    await tour.updateComplete
    expect([openWhenHeard, tour.open]).toEqual([true, false])
  })
})
