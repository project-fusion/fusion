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
