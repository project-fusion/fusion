import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { type LeafletLayer, type LeafletMap, leafletDriver } from './leaflet-driver.js'

beforeAll(() => {
  registerDom()
})

/** A Leaflet map as far as the driver can tell. */
const stand = (
  options: { control?: boolean; keyboard?: boolean } = {},
): { asked: string[]; fire(): void; layers: LeafletLayer[]; map: LeafletMap } => {
  const asked: string[] = []
  const listeners = new Set<() => void>()
  const layers: LeafletLayer[] = []
  const container = document.createElement('div')
  let keys = true
  const map: LeafletMap = {
    addControl: () => {
      asked.push('addControl')
    },
    attributionControl:
      options.control === false
        ? undefined
        : {
            options: { prefix: '<a href="https://leafletjs.com">Leaflet</a>' },
            remove: () => {
              asked.push('remove control')
            },
          },
    eachLayer: (visit) => {
      for (const layer of layers) {
        visit(layer)
      }
    },
    getContainer: () => container,
    keyboard:
      options.keyboard === false
        ? undefined
        : {
            disable: () => {
              keys = false
            },
            enable: () => {
              keys = true
            },
            enabled: () => keys,
          },
    off: (_type, listener) => listeners.delete(listener),
    on: (_type, listener) => {
      listeners.add(listener)
    },
    panBy: ([x, y], panned) => {
      asked.push(`panBy ${x} ${y} ${panned?.animate}`)
    },
    zoomControl: {
      remove: () => {
        asked.push('remove zoom')
      },
    },
    zoomIn: (delta, zoomed) => {
      asked.push(`zoomIn ${delta} ${zoomed?.animate}`)
    },
    zoomOut: (delta, zoomed) => {
      asked.push(`zoomOut ${delta} ${zoomed?.animate}`)
    },
  }
  const fire = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }
  return { asked, fire, layers, map }
}

describe('leafletDriver', () => {
  test('a pan is pixels and a zoom is one level, as Leaflet’s own buttons take', () => {
    const { asked, map } = stand()
    const driver = leafletDriver(map)
    driver.panBy(-100, 50, true)
    driver.zoomBy(1, true)
    driver.zoomBy(-1, false)
    expect(asked).toEqual(['panBy -100 50 true', 'zoomIn 1 true', 'zoomOut 1 false'])
  })

  test('its keys go quiet and come back, and a map made without them is left alone', () => {
    const { map } = stand()
    const restore = leafletDriver(map).silenceKeyboard?.()
    expect(map.keyboard?.enabled()).toBe(false)
    restore?.()
    expect(map.keyboard?.enabled()).toBe(true)

    const bare = stand({ keyboard: false })
    expect(() => leafletDriver(bare.map).silenceKeyboard?.()?.()).not.toThrow()
  })

  test('its zoom buttons come off for the frame’s and go back after', () => {
    const { asked, map } = stand()
    const restore = leafletDriver(map).replaceZoom?.()
    expect(asked).toEqual(['remove zoom'])
    restore?.()
    expect(asked).toEqual(['remove zoom', 'addControl'])
  })

  test('the container is what it takes out of the tab order', () => {
    const { map } = stand()
    expect(leafletDriver(map).focusTarget?.()).toBe(map.getContainer())
  })

  test('its credit is the prefix and every layer’s, and its control comes off and goes back', () => {
    const { asked, fire, layers, map } = stand()
    let heard = 0
    const credits = leafletDriver(map).credits?.(() => {
      heard += 1
    })
    expect(asked).toEqual(['remove control'])
    layers.push({ getAttribution: () => '© OpenStreetMap contributors' }, {})
    fire()
    expect(heard).toBe(1)
    expect(credits?.read()).toEqual([
      '<a href="https://leafletjs.com">Leaflet</a>',
      '© OpenStreetMap contributors',
    ])
    credits?.stop()
    expect(asked).toEqual(['remove control', 'addControl'])
  })

  test('a map made without a credit control still has its layers credited', () => {
    const { layers, map } = stand({ control: false })
    layers.push({ getAttribution: () => 'Tiles' })
    expect(
      leafletDriver(map)
        .credits?.(() => undefined)
        .read(),
    ).toEqual(['Tiles'])
  })
})
