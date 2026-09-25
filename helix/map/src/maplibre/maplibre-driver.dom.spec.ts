import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
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
  fire(type: 'sourcedata' | 'styledata'): void
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
    getCanvas: () => canvas,
    getContainer: () => container,
    getSource: (id) => sources[id],
    getStyle: () => ({ sources }),
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
      asked.push(`panBy ${x} ${y} ${options?.animate}`)
    },
    zoomIn: (options) => {
      asked.push(`zoomIn ${options?.animate}`)
    },
    zoomOut: (options) => {
      asked.push(`zoomOut ${options?.animate}`)
    },
  }
  const fire = (type: 'sourcedata' | 'styledata'): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener()
    }
  }
  return { asked, fire, map, sources }
}

describe('mapLibreDriver', () => {
  test('a pan and a zoom are MapLibre’s own calls', () => {
    const { asked, map } = stand()
    const driver = mapLibreDriver(map)
    driver.panBy(100, -50, true)
    driver.zoomBy(1, false)
    driver.zoomBy(-1, true)
    expect(asked).toEqual(['panBy 100 -50 true', 'zoomIn false', 'zoomOut true'])
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
