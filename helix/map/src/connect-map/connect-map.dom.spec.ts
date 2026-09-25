import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapDriver } from './connect-map.js'

/* Imported after the DOM is registered, like the elements: the connector
   reaches `@fusion.dev/helix-core`, which evaluates Lit, and Lit's element
   class extends whatever `HTMLElement` exists when it first loads. */
let connectMap: typeof import('./connect-map.js').connectMap

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/map')
  ;({ connectMap } = await import('./connect-map.js'))
})

type Frame = HTMLElement & {
  pan(to: 'up' | 'down' | 'start' | 'end'): void
  updateComplete: Promise<boolean>
  zoom(by: number): void
}

/** What a driver was asked, in order, and the state it keeps. */
interface Recording {
  calls: string[]
  credits: string[]
  changed?: () => void
  keyboard: boolean
  stopped: boolean
}

/** A driver that writes down what it is asked rather than moving anything. */
const recorder = (target?: HTMLElement): { driver: MapDriver; seen: Recording } => {
  const seen: Recording = { calls: [], credits: [], keyboard: true, stopped: false }
  const driver: MapDriver = {
    credits(changed) {
      seen.changed = changed
      return {
        read: () => seen.credits,
        stop: () => {
          seen.stopped = true
        },
      }
    },
    focusTarget: () => target ?? null,
    panBy: (x, y, animate) => {
      seen.calls.push(`pan ${x} ${y} ${animate}`)
    },
    replaceZoom: () => {
      seen.calls.push('replace zoom')
      return () => {
        seen.calls.push('restore zoom')
      }
    },
    silenceKeyboard: () => {
      seen.keyboard = false
      return () => {
        seen.keyboard = true
      }
    },
    zoomBy: (direction, animate) => {
      seen.calls.push(`zoom ${direction} ${animate}`)
    },
  }
  return { driver, seen }
}

/** A frame whose viewport measures 400 by 200, which happy-dom never lays out. */
const frame = async (inside = ''): Promise<Frame> => {
  const host = (await mount(
    `<helix-headless-map label="Harbor">${inside}</helix-headless-map>`,
  )) as Frame
  await host.updateComplete
  const viewport = part(host, 'viewport') as HTMLElement
  viewport.getBoundingClientRect = () => ({ height: 200, width: 400 }) as DOMRect
  return host
}

const credit = (host: HTMLElement): HTMLElement | null => host.querySelector('[slot="attribution"]')

afterEach(() => {
  delete (globalThis as { matchMedia?: unknown }).matchMedia
})

describe('connectMap', () => {
  test('a pan in reading order reaches the driver in pixels on screen', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    for (const way of ['end', 'start', 'up', 'down'] as const) {
      host.pan(way)
    }
    // A quarter of the viewport: of its width across, of its height down.
    expect(seen.calls).toEqual([
      'replace zoom',
      'pan 100 0 true',
      'pan -100 0 true',
      'pan 0 -50 true',
      'pan 0 50 true',
    ])
  })

  test('on a right-to-left page, start is right and end is left', async () => {
    const host = await frame()
    host.style.direction = 'rtl'
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.pan('end')
    host.pan('start')
    expect(seen.calls).toEqual(['replace zoom', 'pan -100 0 true', 'pan 100 0 true'])
  })

  test('a zoom reaches the driver as a direction', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.zoom(1)
    host.zoom(-1)
    host.zoom(0)
    expect(seen.calls).toEqual(['replace zoom', 'zoom 1 true', 'zoom -1 true'])
  })

  test('a reader who asked for less motion gets none', async () => {
    ;(globalThis as { matchMedia?: unknown }).matchMedia = (query: string) => ({
      matches: query.includes('reduce'),
    })
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.pan('end')
    host.zoom(1)
    expect(seen.calls).toEqual(['replace zoom', 'pan 100 0 false', 'zoom 1 false'])
  })

  test('the frame is the one tab stop and the one set of keys, until it lets go', async () => {
    const host = await frame()
    const canvas = document.createElement('canvas')
    canvas.setAttribute('tabindex', '0')
    const { driver, seen } = recorder(canvas)
    const connection = connectMap(host, driver)
    expect(seen.keyboard).toBe(false)
    expect(canvas.getAttribute('tabindex')).toBe('-1')
    connection.disconnect()
    expect(seen.keyboard).toBe(true)
    expect(canvas.getAttribute('tabindex')).toBe('0')
  })

  test('a target that had no tabindex is left with none', async () => {
    const host = await frame()
    const canvas = document.createElement('canvas')
    const { driver } = recorder(canvas)
    connectMap(host, driver).disconnect()
    expect(canvas.hasAttribute('tabindex')).toBe(false)
  })

  test('the renderer keeps its zoom buttons where the frame draws none', async () => {
    const host = (await mount(
      '<helix-headless-map label="Harbor" controls="none"></helix-headless-map>',
    )) as Frame
    await host.updateComplete
    const { driver, seen } = recorder()
    connectMap(host, driver)
    expect(seen.calls).toEqual([])
  })

  test('the renderer keeps its keys where the page asks', async () => {
    const host = await frame()
    const canvas = document.createElement('canvas')
    canvas.setAttribute('tabindex', '0')
    const { driver, seen } = recorder(canvas)
    connectMap(host, driver, { keyboard: 'renderer' })
    expect(seen.keyboard).toBe(true)
    expect(canvas.getAttribute('tabindex')).toBe('0')
  })

  test('the credit is written into the slot as text and links, and kept current', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    seen.credits = [
      '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> contributors',
    ]
    connectMap(host, driver)
    const slotted = credit(host) as HTMLElement
    expect(slotted.textContent).toBe('© OpenStreetMap contributors')
    expect(slotted.querySelector('a')?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/copyright',
    )
    seen.credits = ['Weather by Rain Co']
    seen.changed?.()
    expect(slotted.textContent).toBe('Weather by Rain Co')
  })

  test('a credit that is markup is never run as markup', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    seen.credits = [
      '<img src=x onerror="alert(1)"><a href="javascript:alert(1)">Tiles</a> <b>by</b> us',
    ]
    connectMap(host, driver)
    const slotted = credit(host) as HTMLElement
    expect(slotted.textContent).toBe('Tiles by us')
    expect(slotted.querySelector('img, b, a')).toBeNull()
  })

  test('a page that slotted its own credit keeps it, and one that says no gets none', async () => {
    const own = await frame('<span slot="attribution">Ours</span>')
    const first = recorder()
    first.seen.credits = ['Theirs']
    connectMap(own, first.driver)
    expect(own.querySelectorAll('[slot="attribution"]')).toHaveLength(1)
    expect(credit(own)?.textContent).toBe('Ours')

    const none = await frame()
    const second = recorder()
    second.seen.credits = ['Theirs']
    connectMap(none, second.driver, { credit: false })
    expect(credit(none)).toBeNull()
  })

  test('disconnecting stops answering and takes the credit away', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    seen.credits = ['Tiles']
    const connection = connectMap(host, driver)
    connection.disconnect()
    host.pan('end')
    host.zoom(1)
    expect(seen.calls).toEqual(['replace zoom', 'restore zoom'])
    expect(seen.stopped).toBe(true)
    expect(credit(host)).toBeNull()
  })
})
