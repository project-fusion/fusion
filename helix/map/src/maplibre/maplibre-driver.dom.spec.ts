import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapMotion } from '../motion/motion.js'
import { type MapLibreMap, mapLibreDriver } from './maplibre-driver.js'

beforeAll(() => {
  registerDom()
})

/**
 * A MapLibre map as far as the driver can tell: what it was asked, its keyboard
 * handler, its sources and the credit control MapLibre draws in its container.
 */
const stand = (): {
  asked: string[]
  fire(type: 'move' | 'resize' | 'sourcedata' | 'styledata'): void
  map: MapLibreMap
  sources: Record<string, { attribution?: string }>
} => {
  const asked: string[] = []
  const listeners = new Map<string, Set<() => void>>()
  const container = document.createElement('div')
  container.innerHTML = '<div class="maplibregl-ctrl-attrib">MapLibre credit</div>'
  const canvas = document.createElement('canvas')
  const sources: Record<string, { attribution?: string }> = {}
  let keys = true
  const map: MapLibreMap = {
    easeTo: ({ center, duration, easing, zoom }) => {
      asked.push(`easeTo ${center.join(',')} ${zoom} ${duration} ${easing?.(0.5)}`)
    },
    getCanvas: () => canvas,
    getContainer: () => container,
    getSource: (id) => sources[id],
    getStyle: () => ({ sources }),
    jumpTo: ({ center, zoom }) => {
      asked.push(`jumpTo ${center.join(',')} ${zoom}`)
    },
    keyboard: {
      disable: () => {
        keys = false
      },
      enable: () => {
        keys = true
      },
      isEnabled: () => keys,
    },
    off: (type, listener) => listeners.get(type)?.delete(listener),
    on: (type, listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener))
    },
    panBy: ([x, y], options) => {
      asked.push(
        `panBy ${x} ${y} ${options?.animate} ${options?.duration} ${options?.easing?.(0.5)}`,
      )
    },
    // Ten pixels a degree from the origin, which is enough to tell the axes apart.
    project: ([lng, lat]) => ({ x: lng * 10, y: -lat * 10 }),
    zoomIn: (options) => {
      asked.push(`zoomIn ${options?.animate} ${options?.duration}`)
    },
    zoomOut: (options) => {
      asked.push(`zoomOut ${options?.animate} ${options?.duration}`)
    },
  }
  const fire = (type: 'move' | 'resize' | 'sourcedata' | 'styledata'): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener()
    }
  }
  return { asked, fire, map, sources }
}

/**
 * A motion as the connector hands one over, its curve a square so the call
 * shows it was the page's curve that arrived and not MapLibre's own.
 */
const glide: MapMotion = { duration: 250, easing: (t) => t * t }

describe('mapLibreDriver', () => {
  test('a pan and a zoom are MapLibre’s own calls, over the page’s duration and curve', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.panBy(100, -50, glide)
    driver.zoomBy(1, null)
    driver.zoomBy(-1, glide)
    expect(asked).toEqual([
      'panBy 100 -50 undefined 250 0.25',
      'zoomIn false undefined',
      'zoomOut undefined 250',
    ])
  })

  test('its keys go quiet and come back only if they were on', () => {
    const { map } = stand()
    const restore = mapLibreDriver(map).silenceKeyboard?.()
    expect(map.keyboard.isEnabled()).toBe(false)
    restore?.()
    expect(map.keyboard.isEnabled()).toBe(true)

    map.keyboard.disable()
    mapLibreDriver(map).silenceKeyboard?.()?.()
    expect(map.keyboard.isEnabled()).toBe(false)
  })

  test('a place is where MapLibre projects it, longitude first as MapLibre takes it', () => {
    const { map } = stand()
    expect(mapLibreDriver(map).project?.({ lat: 2, lng: 3 })).toEqual({ x: 30, y: -20 })
  })

  test('showing a place glides on the page’s curve, or jumps where there is no motion to have', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.show?.({ lat: 2, lng: 3, zoom: 14 }, glide)
    driver.show?.({ lat: 2, lng: 3 }, null)
    expect(asked).toEqual(['easeTo 3,2 14 250 0.25', 'jumpTo 3,2 undefined'])
  })

  test('the view moving is heard until it is told to stop', () => {
    const { fire, map } = stand()
    let heard = 0
    const stop = mapLibreDriver(map).onView?.(() => {
      heard += 1
    })
    fire('move')
    fire('resize')
    stop?.()
    fire('move')
    expect(heard).toBe(2)
  })

  test('the canvas is what it takes out of the tab order', () => {
    const { map } = stand()
    expect(mapLibreDriver(map).focusTarget?.()).toBe(map.getCanvas())
  })

  test('its credit is every source’s, heard again as sources arrive, and its control is put back', () => {
    const { fire, map, sources } = stand()
    const control = map.getContainer().querySelector('.maplibregl-ctrl-attrib') as HTMLElement
    let heard = 0
    const credits = mapLibreDriver(map).credits?.(() => {
      heard += 1
    })
    expect(control.style.display).toBe('none')
    expect(credits?.read()).toEqual([])
    sources.base = { attribution: '© OpenStreetMap contributors' }
    sources.hills = {}
    fire('sourcedata')
    expect(heard).toBe(1)
    expect(credits?.read()).toEqual(['© OpenStreetMap contributors'])
    credits?.stop()
    fire('styledata')
    expect(heard).toBe(1)
    expect(control.style.display).toBe('')
  })
})
