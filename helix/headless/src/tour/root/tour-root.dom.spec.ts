import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion-io/testing/dom'

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
