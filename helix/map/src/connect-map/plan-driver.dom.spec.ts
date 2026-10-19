import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapMotion } from '../motion/motion.js'
import type { MapDriver } from './connect-map.js'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit. */
let connectMap: typeof import('./connect-map.js').connectMap

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/map')
  ;({ connectMap } = await import('./connect-map.js'))
})

/**
 * The driver the Maps guide writes under "Write a driver", line for line in
 * the guide's JavaScript with its types added, so the guide's example is one
 * that runs: a plan drawn as one image, such as a floor plan, whose edges are
 * at known latitudes and longitudes.
 */
const planDriver = (
  image: HTMLElement,
  plan: { east: number; height: number; north: number; south: number; west: number; width: number },
): MapDriver => {
  const view = { scale: 1, x: 0, y: 0 }
  const listeners = new Set<() => void>()
  let moving = 0

  const draw = (): void => {
    image.style.transformOrigin = '0 0'
    image.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
    for (const moved of listeners) {
      moved()
    }
  }

  // Moves the view to `next` over the page's motion, or at once where it is null.
  const go = (next: typeof view, motion: MapMotion | null): void => {
    const run = ++moving
    if (!motion || motion.duration <= 0) {
      Object.assign(view, next)
      draw()
      return
    }
    const from = { ...view }
    const start = performance.now()
    const step = (now: number): void => {
      if (run !== moving) {
        return
      }
      const t = Math.min(1, (now - start) / motion.duration)
      const k = motion.easing(t)
      view.x = from.x + (next.x - from.x) * k
      view.y = from.y + (next.y - from.y) * k
      view.scale = from.scale + (next.scale - from.scale) * k
      draw()
      if (t < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }

  return {
    onView: (moved) => {
      listeners.add(moved)
      return () => listeners.delete(moved)
    },
    panBy: (x, y, motion) => go({ ...view, x: view.x - x, y: view.y - y }, motion),
    project: ({ lat, lng }) => ({
      x: view.x + ((lng - plan.west) / (plan.east - plan.west)) * plan.width * view.scale,
      y: view.y + ((plan.north - lat) / (plan.north - plan.south)) * plan.height * view.scale,
    }),
    zoom: () => Math.log2(view.scale),
    zoomBy: (direction, motion) => {
      const box = image.parentElement?.getBoundingClientRect() ?? { height: 0, width: 0 }
      const k = direction > 0 ? 2 : 0.5
      const [cx, cy] = [box.width / 2, box.height / 2]
      go({ scale: view.scale * k, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k }, motion)
    },
  }
}

/** Waits for `done` to hold, a frame at a time, for up to three seconds. */
const until = async (done: () => boolean): Promise<boolean> => {
  const end = performance.now() + 3000
  while (!done() && performance.now() < end) {
    await new Promise((next) => setTimeout(next, 16))
  }
  return done()
}

describe('the driver the Maps guide writes', () => {
  test('places the markers, and the frame says the zoom the driver reports', async () => {
    const host = (await mount(
      `<helix-headless-map label="Venue">
        <div style="inline-size: 400px; block-size: 300px; overflow: hidden"><div data-plan></div></div>
        <helix-headless-map-marker label="Stage" lat="10" lng="10"></helix-headless-map-marker>
      </helix-headless-map>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await host.updateComplete
    const image = host.querySelector('[data-plan]') as HTMLElement
    const connection = connectMap(
      host,
      planDriver(image, { east: 20, height: 300, north: 20, south: 0, west: 0, width: 400 }),
    )
    try {
      const stage = host.querySelector('helix-headless-map-marker') as HTMLElement
      expect(await until(() => hasState(stage, 'placed'))).toBe(true)
      ;(part(host, 'zoom-in') as HTMLElement).click()
      expect(await until(() => image.style.transform.includes('scale(2)'))).toBe(true)
      expect(await until(() => part(host, 'live')?.textContent?.trim() === 'Zoom level 1')).toBe(
        true,
      )
    } finally {
      connection.disconnect()
    }
  })
})
