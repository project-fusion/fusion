import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@helix-io/testing/dom'

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
      <helix-base-tour label="Getting started" ${open ? 'open' : ''}>
        <helix-base-tour-stop for="one">First</helix-base-tour-stop>
        <helix-base-tour-stop for="two">Second</helix-base-tour-stop>
        <helix-base-tour-stop for="three">Third</helix-base-tour-stop>
      </helix-base-tour>
    </div>`,
  )) as HTMLElement
  const tour = host.querySelector('helix-base-tour') as Tour
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
    tour.addEventListener('helix-change', (event) => {
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
    tour.addEventListener('helix-close', () => {
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

describe('a stop', () => {
  test('finds its target by id, the way a tooltip does', async () => {
    const tour = await run()
    const stop = tour.stops[1] as HTMLElement & { target: HTMLElement | null }
    expect(stop.target?.id).toBe('two')
  })

  test('and finds nothing where the id resolves to nothing', async () => {
    const host = (await mount(
      '<helix-base-tour open><helix-base-tour-stop for="nowhere">X</helix-base-tour-stop></helix-base-tour>',
    )) as Tour
    await host.updateComplete
    const stop = host.stops[0] as HTMLElement & { target: HTMLElement | null }
    expect(stop.target).toBeNull()
  })
})

/**
 * The three things `21-component-audit.md` named against this family, each of
 * which was live for two days and none of which had a test.
 *
 * `index` carried an `@controlled` tag and honoured none of it: the tour wrote
 * the property and announced afterwards, so a refusal arrived after the move it
 * was refusing and a consumer who declared `index` had it overwritten on the
 * next press. `skip()` and `finish()` did the same with `open`.
 *
 * The tag was invisible to `check:controlled`, whose regex wanted the property
 * name followed immediately by `(`, `:` or `=` and so read `get value():` and
 * not `index = 0`. Twelve of the thirteen tags in the library are written the
 * first way, which is why a check reporting a count rather than the names it
 * found could go on looking thorough.
 */
describe('moving between stops', () => {
  test('announces before it moves, so a refusal is a refusal', async () => {
    const tour = await run()
    tour.addEventListener('helix-change', (event) => {
      event.preventDefault()
    })
    tour.next()
    await tour.updateComplete
    expect(tour.index).toBe(0)
  })

  test('and moves where nothing refused', async () => {
    const tour = await run()
    const seen: string[] = []
    tour.addEventListener('helix-change', () => {
      seen.push(`heard at ${tour.index}`)
    })
    tour.next()
    await tour.updateComplete
    expect(seen).toEqual(['heard at 0'])
    expect(tour.index).toBe(1)
  })
})

describe('a tour whose stop the consumer owns', () => {
  /* Declaring `index` is a claim of ownership, so the tour announces and
     applies nothing until it is told, which is the contract the tag promises
     and the whole reason it is worth having. */
  test('announces and applies nothing itself', async () => {
    /* Three stops and starting on the first, because `next()` on the last stop
       is a completion rather than a move and announces nothing at all. */
    const host = (await mount(
      `<helix-base-tour open index="0">
        <helix-base-tour-stop for="a">A</helix-base-tour-stop>
        <helix-base-tour-stop for="b">B</helix-base-tour-stop>
        <helix-base-tour-stop for="c">C</helix-base-tour-stop>
      </helix-base-tour>`,
    )) as Tour
    await host.updateComplete
    let heard = 0
    host.addEventListener('helix-change', () => {
      heard += 1
    })
    host.next()
    await host.updateComplete
    expect([heard, host.index]).toEqual([1, 0])
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
      `<helix-base-tour open default-index="1">
        <helix-base-tour-stop for="a">A</helix-base-tour-stop>
        <helix-base-tour-stop for="b">B</helix-base-tour-stop>
      </helix-base-tour>`,
    )) as Tour
    await host.updateComplete
    expect(host.index).toBe(1)
  })
})

describe('leaving the run', () => {
  /* Only one of the two ways out is a request. `HelixCloseEvent` is
     `cancelable: true` and `HelixCompleteEvent` is not, deliberately: leaving
     early is something a consumer may refuse, and having finished is something
     that has already happened. The audit read both as closes and said neither
     was cancelable; only the first of them ever could be. */
  test('is cancelable when the reader is leaving early', async () => {
    const tour = await run()
    tour.addEventListener('helix-close', (event) => {
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
