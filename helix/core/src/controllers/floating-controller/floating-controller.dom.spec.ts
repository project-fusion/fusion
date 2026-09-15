import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { FloatingController } from './floating-controller.js'

/**
 * What placing costs per frame, which is the half of this controller that runs
 * on every scroll of every ancestor and so has to stay cheap.
 *
 * The geometry itself is Floating UI's and is not re-asserted here. What is
 * asserted is a count: the arrow's clearance is a `getComputedStyle` on the
 * floating element and four parses, and it was taken on every `update`, for a
 * radius that does not change while the surface is up. happy-dom has no layout,
 * so every rectangle is zero, and the count is the same whatever the boxes.
 */
beforeAll(() => {
  registerDom()
})

const live: FloatingController[] = []
afterEach(() => {
  for (const one of live.splice(0)) {
    one.stop()
  }
})

/**
 * Reads of the floating element's corner radius across a start and three
 * updates.
 *
 * The radius and not the style: Floating UI reads the floating element's
 * computed style for its own reasons on every placement, arrow or no arrow,
 * and `autoUpdate` places once as it starts, so a count of style reads is a
 * count of that library's internals. The radius is read by `corner` and by
 * nothing else, so it is the number that says how often the clearance was
 * measured.
 */
const radiusReads = async (withArrow: boolean): Promise<number> => {
  document.body.innerHTML =
    '<div id="host"><button id="anchor">open</button><div id="floating"><i id="arrow"></i></div></div>'
  const host = document.getElementById('host') as HTMLElement
  Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
  const anchor = document.getElementById('anchor') as HTMLElement
  const floating = document.getElementById('floating') as HTMLElement
  const arrow = document.getElementById('arrow') as HTMLElement
  floating.style.borderRadius = '4px'

  const real = globalThis.getComputedStyle
  let reads = 0
  globalThis.getComputedStyle = ((element: Element, pseudo?: string | null) => {
    const style = real(element, pseudo)
    if (element !== floating) {
      return style
    }
    return new Proxy(style, {
      get(target, key) {
        if (key === 'borderTopLeftRadius') {
          reads += 1
        }
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  }) as typeof real
  try {
    const controller = new FloatingController(host as never, {
      anchor: () => anchor,
      ...(withArrow ? { arrow: () => arrow } : {}),
      floating: () => floating,
    })
    live.push(controller)
    controller.start()
    for (let at = 0; at < 3; at += 1) {
      controller.update()
      // `computePosition` is async, so its reads land after a tick.
      await new Promise((done) => setTimeout(done, 0))
    }
  } finally {
    globalThis.getComputedStyle = real
  }
  return reads
}

describe('the arrow’s clearance from the corners', () => {
  test('is read once as placing starts, not once per placement', async () => {
    expect(await radiusReads(true)).toBe(1)
  })

  test('and not at all where there is no arrow to clear them', async () => {
    expect(await radiusReads(false)).toBe(0)
  })
})

/**
 * The arrow's four edges, which is what lets any sheet draw the arrow without
 * knowing which side the panel landed on.
 *
 * A document sheet reaches the arrow through `::part()` and cannot follow it
 * with `data-placement`, so every headless preview pinned one edge, and a panel
 * that flipped pointed away from its anchor. What is asserted is which edge
 * faces the anchor for each side, that the other two are `auto` so nothing is
 * left for the writing direction to settle, and that all four are `important`,
 * which is what beats a normal declaration arriving through `::part()`.
 * happy-dom lays nothing out, so the reach is zero here; the browser specs of
 * each family measure it.
 */
describe('the arrow', () => {
  const FACING = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' } as const

  for (const side of ['bottom', 'left', 'right', 'top'] as const) {
    test(`hangs off the edge facing the anchor when the panel lands ${side}`, async () => {
      document.body.innerHTML =
        '<div id="host"><button id="anchor">open</button><div id="floating"><i id="arrow"></i></div></div>'
      const host = document.getElementById('host') as HTMLElement
      Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
      const arrow = document.getElementById('arrow') as HTMLElement
      const controller = new FloatingController(host as never, {
        anchor: () => document.getElementById('anchor'),
        arrow: () => arrow,
        flip: false,
        floating: () => document.getElementById('floating'),
        placement: side,
        shift: false,
      })
      live.push(controller)
      controller.update()
      await new Promise((done) => setTimeout(done, 0))
      const facing = FACING[side]
      const along = side === 'top' || side === 'bottom' ? 'left' : 'top'
      const reach = (along === 'left' ? arrow.offsetHeight : arrow.offsetWidth) / 2
      for (const edge of ['bottom', 'left', 'right', 'top']) {
        expect(arrow.style.getPropertyPriority(edge)).toBe('important')
        const value = arrow.style.getPropertyValue(edge)
        if (edge === facing) {
          expect(value).toBe(`${-reach}px`)
        } else if (edge === along) {
          expect(value).toMatch(/^-?\d+(\.\d+)?px$/)
        } else {
          expect(value).toBe('auto')
        }
      }
    })
  }

  test('and gives all four back when placing is taken back', async () => {
    document.body.innerHTML =
      '<div id="host"><button id="anchor">open</button><div id="floating"><i id="arrow"></i></div></div>'
    const host = document.getElementById('host') as HTMLElement
    Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
    const arrow = document.getElementById('arrow') as HTMLElement
    const controller = new FloatingController(host as never, {
      anchor: () => document.getElementById('anchor'),
      arrow: () => arrow,
      floating: () => document.getElementById('floating'),
    })
    live.push(controller)
    controller.update()
    await new Promise((done) => setTimeout(done, 0))
    expect(arrow.style.getPropertyValue('top')).not.toBe('')
    controller.release()
    for (const edge of ['bottom', 'left', 'right', 'top']) {
      expect(arrow.style.getPropertyValue(edge)).toBe('')
    }
  })
})
