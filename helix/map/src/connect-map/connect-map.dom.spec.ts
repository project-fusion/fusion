import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { MapMotion } from '../motion/motion.js'
import type { MapDriver, MapLayerSpec } from './connect-map.js'

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
  /** Every motion a pan was handed, for a spec that reads the curve. */
  motions: (MapMotion | null)[]
  stopped: boolean
}

/**
 * What the connector placed an element at: kept in the element's own shadow
 * root, which the page's `style` never shows.
 */
const placedAt = (element: Element, name: string): string =>
  (element as Element & { placed(name: string): string | undefined }).placed(name) ?? ''

/** A motion as a word: its duration, or a jump where there is none. */
const paced = (motion: MapMotion | null): string => (motion ? `${motion.duration}ms` : 'jump')

/** A driver that writes down what it is asked rather than moving anything. */
const recorder = (target?: HTMLElement): { driver: MapDriver; seen: Recording } => {
  const seen: Recording = { calls: [], credits: [], keyboard: true, motions: [], stopped: false }
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
    panBy: (x, y, motion) => {
      seen.calls.push(`pan ${x} ${y} ${paced(motion)}`)
      seen.motions.push(motion)
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
    zoomBy: (direction, motion) => {
      seen.calls.push(`zoom ${direction} ${paced(motion)}`)
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
      'pan 100 0 200ms',
      'pan -100 0 200ms',
      'pan 0 -50 200ms',
      'pan 0 50 200ms',
    ])
  })

  test('on a right-to-left page, start is right and end is left', async () => {
    const host = await frame()
    host.style.direction = 'rtl'
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.pan('end')
    host.pan('start')
    expect(seen.calls).toEqual(['replace zoom', 'pan -100 0 200ms', 'pan 100 0 200ms'])
  })

  test('a zoom reaches the driver as a direction', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.zoom(1)
    host.zoom(-1)
    host.zoom(0)
    expect(seen.calls).toEqual(['replace zoom', 'zoom 1 200ms', 'zoom -1 200ms'])
  })

  test('a step takes the page’s own duration and curve, and a theme with none jumps', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    host.style.setProperty('--helix-duration-normal', '90ms')
    host.style.setProperty('--helix-easing-standard', 'linear')
    host.pan('end')
    host.style.setProperty('--helix-duration-normal', '0ms')
    host.pan('end')
    expect(seen.calls).toEqual(['replace zoom', 'pan 100 0 90ms', 'pan 100 0 jump'])
    // The curve that arrived is the page's: linear is halfway at halfway.
    expect(seen.motions[0]?.easing(0.5)).toBe(0.5)
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
    expect(seen.calls).toEqual(['replace zoom', 'pan 100 0 jump', 'zoom 1 jump'])
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
    expect(slotted.querySelector('a')?.dataset.link).toBe('quiet')
    seen.credits = ['Weather by Rain Co']
    seen.changed?.()
    await Promise.resolve()
    expect(slotted.textContent).toBe('Weather by Rain Co')
  })

  test('a renderer with nothing to credit slots nothing, until it has something', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    expect(credit(host)).toBeNull()
    seen.credits = ['Tiles']
    seen.changed?.()
    await Promise.resolve()
    expect(credit(host)?.textContent).toBe('Tiles')
    seen.credits = []
    seen.changed?.()
    await Promise.resolve()
    expect(credit(host)).toBeNull()
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

  test('a credit said again is left as it is, so a reader on its link stays there', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    seen.credits = ['<a href="https://openstreetmap.org">OpenStreetMap</a>']
    connectMap(host, driver)
    const link = credit(host)?.querySelector('a') as HTMLAnchorElement
    seen.changed?.()
    await Promise.resolve()
    seen.changed?.()
    await Promise.resolve()
    expect(credit(host)?.querySelector('a')).toBe(link)
    seen.credits = ['<a href="https://openfreemap.org">OpenFreeMap</a>']
    seen.changed?.()
    await Promise.resolve()
    expect(credit(host)?.textContent).toBe('OpenFreeMap')
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

/** A driver that projects a degree to ten pixels and can be told the view moved. */
const projecting = (): {
  driver: MapDriver
  moved: () => void
  shown: string[]
} => {
  const shown: string[] = []
  let heard = (): void => undefined
  let offset = 0
  const driver: MapDriver = {
    onView: (moved) => {
      heard = moved
      return () => {
        heard = () => undefined
      }
    },
    panBy: () => {},
    project: ({ lat, lng }) => ({ x: lng * 10 + offset, y: lat * 10 }),
    show: ({ lat, lng }, motion) => {
      shown.push(`${lat},${lng} ${paced(motion)}`)
    },
    zoomBy: () => {},
  }
  return {
    driver,
    moved: () => {
      offset += 5
      heard()
    },
    shown,
  }
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('connectMap with markers', () => {
  test('each marker is stood on its place, and moves with the view', async () => {
    const host = await frame(
      '<helix-headless-map-marker label="Depot" lat="2" lng="3"></helix-headless-map-marker>',
    )
    const marker = host.querySelector('helix-headless-map-marker') as HTMLElement
    const { driver, moved } = projecting()
    connectMap(host, driver)
    expect(placedAt(marker, '--_map-marker-x')).toBe('30px')
    expect(placedAt(marker, '--_map-marker-y')).toBe('20px')
    moved()
    expect(placedAt(marker, '--_map-marker-x')).toBe('35px')
  })

  test('a marker is placed without a word written onto its style, which is the page’s', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="2" lng="3" style="color: red"></helix-headless-map-marker>
       <helix-headless-map-position label="Van" lat="2" lng="3"></helix-headless-map-position>`,
    )
    const marker = host.querySelector('helix-headless-map-marker') as HTMLElement
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    const { driver, moved } = projecting()
    connectMap(host, driver)
    expect(marker.getAttribute('style')).toBe('color: red')
    expect(position.hasAttribute('style')).toBe(false)
    /* A page that sets the whole of `style` again takes nothing of the place. */
    marker.setAttribute('style', 'color: blue')
    moved()
    expect(marker.getAttribute('style')).toBe('color: blue')
    expect(placedAt(marker, '--_map-marker-x')).toBe('35px')
    expect(placedAt(position, '--_map-position-x')).toBe('35px')
  })

  test('a marker added or moved later is placed too', async () => {
    const host = await frame()
    const { driver } = projecting()
    connectMap(host, driver)
    const marker = document.createElement('helix-headless-map-marker')
    marker.setAttribute('lat', '1')
    marker.setAttribute('lng', '1')
    host.append(marker)
    await settle()
    expect(placedAt(marker, '--_map-marker-x')).toBe('10px')
    marker.setAttribute('lng', '4')
    await settle()
    expect(placedAt(marker, '--_map-marker-x')).toBe('40px')
  })

  test('a marker with no place is left unplaced, which its sheet hides', async () => {
    const host = await frame(
      '<helix-headless-map-marker label="Nowhere"></helix-headless-map-marker>',
    )
    const { driver } = projecting()
    connectMap(host, driver)
    const marker = host.querySelector('helix-headless-map-marker') as HTMLElement
    expect(placedAt(marker, '--_map-marker-x')).toBe('')
  })

  test('a marker the keyboard reaches off the edge is brought into view, and one in view is not', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Near" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-marker label="Far" lat="1" lng="90"></helix-headless-map-marker>`,
    )
    const { driver, shown } = projecting()
    connectMap(host, driver)
    const [near, far] = [...host.querySelectorAll('helix-headless-map-marker')] as HTMLElement[]
    near?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    far?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(shown).toEqual(['1,90 320ms'])
  })

  test('a name that would run off the view’s end is turned to the side with the room', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Open water" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-marker label="Right by the edge" lat="1" lng="35"></helix-headless-map-marker>`,
    )
    const [open, edge] = [...host.querySelectorAll('helix-headless-map-marker')] as (HTMLElement & {
      extent(): number
      side: 'end' | 'start'
    })[]
    // Eighty pixels of button each, which happy-dom cannot lay out to measure.
    for (const one of [open, edge]) {
      if (one) {
        one.extent = () => 80
      }
    }
    const { driver } = projecting()
    connectMap(host, driver)
    // Ten pixels a degree on a 400-pixel view: 10 has the room, 350 has 50.
    expect([open?.side, edge?.side]).toEqual(['end', 'start'])
  })

  test('and on a right-to-left page the end is the left, so the same place keeps its name after it', async () => {
    const host = await frame(
      '<helix-headless-map-marker label="Right by the edge" lat="1" lng="35"></helix-headless-map-marker>',
    )
    host.style.direction = 'rtl'
    const edge = host.querySelector('helix-headless-map-marker') as HTMLElement & {
      extent(): number
      side: 'end' | 'start'
    }
    edge.extent = () => 80
    connectMap(host, projecting().driver)
    expect(edge.side).toBe('end')
  })

  test('disconnecting takes the places off the markers and stops listening', async () => {
    const host = await frame(
      '<helix-headless-map-marker label="Depot" lat="2" lng="3"></helix-headless-map-marker>',
    )
    const marker = host.querySelector('helix-headless-map-marker') as HTMLElement
    const { driver, moved } = projecting()
    connectMap(host, driver).disconnect()
    expect(placedAt(marker, '--_map-marker-x')).toBe('')
    moved()
    expect(placedAt(marker, '--_map-marker-x')).toBe('')
  })
})

describe('connectMap with routes and areas', () => {
  /** A driver that keeps what it was asked to draw, and when. */
  const layering = (): {
    driver: MapDriver
    drawn: MapLayerSpec[][]
    fitted: string[]
    stopped: boolean[]
  } => {
    const drawn: MapLayerSpec[][] = []
    const fitted: string[] = []
    const stopped: boolean[] = []
    const driver: MapDriver = {
      fit: (bounds, padding, motion) => {
        fitted.push(`${JSON.stringify(bounds)} ${JSON.stringify(padding)} ${paced(motion)}`)
      },
      layers: (read) => {
        drawn.push(read())
        return {
          stop: () => {
            stopped.push(true)
          },
          update: () => {
            drawn.push(read())
          },
        }
      },
      panBy: () => {},
      zoomBy: () => {},
    }
    return { drawn, driver, fitted, stopped }
  }

  test('each route and area reaches the driver as its kind, its points and its name, and one too short to draw does not', async () => {
    const host = await frame(
      `<helix-headless-map-route label="Depot to Mission" points="1,2 3,4"></helix-headless-map-route>
       <helix-headless-map-area label="Zone" points="0,0 0,1 1,1"></helix-headless-map-area>
       <helix-headless-map-route label="Half written" points="5,5"></helix-headless-map-route>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn[0]?.map(({ kind, label, points }) => ({ kind, label, points }))).toEqual([
      {
        kind: 'route',
        label: 'Depot to Mission',
        points: [
          { lat: 1, lng: 2 },
          { lat: 3, lng: 4 },
        ],
      },
      {
        kind: 'area',
        label: 'Zone',
        points: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 },
          { lat: 1, lng: 1 },
        ],
      },
    ])
    expect(typeof drawn[0]?.[0]?.color).toBe('string')
  })

  test('an area with a caption reaches the driver with its words, where they stand and their colors', async () => {
    const host = await frame(
      `<helix-headless-map-area caption=" A " label="Sector A" points="0,0 0,2 2,2 2,0"></helix-headless-map-area>
       <helix-headless-map-area caption="B" caption-placement="outside" label="Sector B" points="0,3 1,4 0,5"></helix-headless-map-area>
       <helix-headless-map-area label="Unnamed on the map" points="5,5 5,6 6,6"></helix-headless-map-area>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    const [a, b, plain] = drawn.at(-1) ?? []
    expect(a?.caption?.text).toBe('A')
    expect(a?.caption?.anchor).toBe('center')
    expect(a?.caption?.at.lat).toBeCloseTo(1, 1)
    expect(a?.caption?.at.lng).toBeCloseTo(1, 1)
    expect(typeof a?.caption?.ink).toBe('string')
    expect(typeof a?.caption?.halo).toBe('string')
    expect(b?.caption).toMatchObject({ anchor: 'bottom', at: { lat: 1, lng: 4 }, text: 'B' })
    expect(plain?.caption).toBeUndefined()
  })

  test('a hidden layer is not drawn, and hiding or showing one draws the layers again', async () => {
    const host = await frame(
      `<helix-headless-map-route label="Shown" points="1,2 3,4"></helix-headless-map-route>
       <helix-headless-map-route hidden label="Hidden" points="1,2 3,4"></helix-headless-map-route>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn.at(-1)?.map((one) => one.label)).toEqual(['Shown'])
    const [shown, hidden] = [...host.children] as HTMLElement[]
    if (shown && hidden) {
      shown.hidden = true
      hidden.hidden = false
    }
    await new Promise((done) => setTimeout(done, 0))
    expect(drawn.at(-1)?.map((one) => one.label)).toEqual(['Hidden'])
  })

  test('terrain reaches the driver as its tiles, its two colors, and how it raises the ground', async () => {
    const host = await frame(
      `<helix-headless-map-terrain attribution="Elevation credit" exaggeration="2" max-zoom="15" raised src="dem" style="color: rgb(1, 2, 3); border-top-color: rgb(4, 5, 6)"></helix-headless-map-terrain>
       <helix-headless-map-terrain label="No tiles"></helix-headless-map-terrain>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn[0]).toEqual([
      {
        attribution: 'Elevation credit',
        color: 'rgb(1, 2, 3)',
        encoding: 'terrarium',
        exaggeration: 2,
        highlight: 'rgb(4, 5, 6)',
        id: expect.any(String),
        kind: 'terrain',
        label: 'Terrain',
        maxZoom: 15,
        points: [],
        raised: true,
        src: 'dem',
      },
    ])
  })

  test('the Satellite map type hides the renderer’s labels, and the menu opening asks for pictures of each type', async () => {
    const host = (await frame(
      '<helix-headless-map-raster ground label="Satellite imagery" max-zoom="16" src="photo/{z}/{y}/{x}"></helix-headless-map-raster>',
    )) as Frame & {
      mapPreviews: Record<string, string>
      mapType?: string
      updateComplete: Promise<boolean>
    }
    const { driver } = layering()
    const labels: boolean[] = []
    const asked: unknown[] = []
    const connection = connectMap(host, {
      ...driver,
      labels: (shown) => labels.push(shown),
      previews: async (ask) => {
        asked.push(ask)
        return { hybrid: 'h.jpg', satellite: 's.jpg', standard: 'm.jpg' }
      },
    })
    expect(labels).toEqual([])
    host.mapType = 'satellite'
    await host.updateComplete
    expect(labels).toEqual([false])
    host.dispatchEvent(new CustomEvent('helix-map-part-change', { detail: { kind: 'menu' } }))
    host.dispatchEvent(new CustomEvent('helix-map-part-change', { detail: { kind: 'menu' } }))
    await new Promise((done) => setTimeout(done, 0))
    expect(asked).toEqual([
      {
        imagery: { maxZoom: 16, src: 'photo/{z}/{y}/{x}' },
        types: ['standard', 'hybrid', 'satellite'],
      },
    ])
    expect(host.mapPreviews).toEqual({ hybrid: 'h.jpg', satellite: 's.jpg', standard: 'm.jpg' })
    connection.disconnect()
    expect(labels).toEqual([false, true])
  })

  test('contour lines reach the driver as their tiles, color, and unit, and land cover as its ground', async () => {
    const host = await frame(
      `<helix-headless-map-contours src="dem" unit="feet" style="color: rgb(1, 2, 3)"></helix-headless-map-contours>
       <helix-headless-map-contours label="No tiles"></helix-headless-map-contours>
       <helix-headless-map-landcover style="color: rgb(9, 9, 9)"></helix-headless-map-landcover>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(
      drawn[0]?.map(({ color, encoding, kind, label, src, unit }) => ({
        color,
        encoding,
        kind,
        label,
        src,
        unit,
      })),
    ).toEqual([
      {
        color: 'rgb(1, 2, 3)',
        encoding: 'terrarium',
        kind: 'contours',
        label: 'Contour lines',
        src: 'dem',
        unit: 'feet',
      },
      {
        color: 'rgb(9, 9, 9)',
        encoding: undefined,
        kind: 'landcover',
        label: 'Land cover',
        src: undefined,
        unit: undefined,
      },
    ])
  })

  test('a raster layer drawn as the ground says so, with the deepest zoom its tiles reach', async () => {
    const host = await frame(
      `<helix-headless-map-raster ground label="Satellite imagery" max-zoom="16" src="x"></helix-headless-map-raster>
       <helix-headless-map-raster label="Radar" src="y"></helix-headless-map-raster>`,
    )
    host.setAttribute('map-type', 'hybrid')
    await (host as Frame & { updateComplete: Promise<boolean> }).updateComplete
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn[0]?.map(({ ground, label, maxZoom }) => ({ ground, label, maxZoom }))).toEqual([
      { ground: true, label: 'Satellite imagery', maxZoom: 16 },
      { ground: undefined, label: 'Radar', maxZoom: undefined },
    ])
  })

  test('buildings reach the driver as their color alone, and a raster layer as its frames, the last shown', async () => {
    const host = await frame(
      `<helix-headless-map-buildings style="color: rgb(9, 9, 9)"></helix-headless-map-buildings>
       <helix-headless-map-raster label="Radar" frames="a b c" attribution="Radar credit"></helix-headless-map-raster>
       <helix-headless-map-raster label="One frame" src="x" opacity="3"></helix-headless-map-raster>
       <helix-headless-map-raster label="Nothing to show"></helix-headless-map-raster>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(
      drawn[0]?.map(({ attribution, color, frame, frames, kind, label, opacity }) => ({
        attribution,
        color,
        frame,
        frames,
        kind,
        label,
        opacity,
      })),
    ).toEqual([
      {
        attribution: undefined,
        color: 'rgb(9, 9, 9)',
        frame: undefined,
        frames: undefined,
        kind: 'buildings',
        label: '3D buildings',
        opacity: undefined,
      },
      {
        attribution: 'Radar credit',
        color: expect.any(String),
        frame: 2,
        frames: ['a', 'b', 'c'],
        kind: 'raster',
        label: 'Radar',
        opacity: 0.7,
      },
      {
        attribution: undefined,
        color: expect.any(String),
        frame: 0,
        frames: ['x'],
        kind: 'raster',
        label: 'One frame',
        opacity: 1,
      },
    ])
  })

  test('a route carries its edge as a casing where the edge is not its own color, and none where it is', async () => {
    const host = await frame(
      `<helix-headless-map-route label="Cased" points="1,2 3,4" style="color: rgb(1, 2, 3); border-color: rgb(250, 250, 250)"></helix-headless-map-route>
       <helix-headless-map-route label="Plain" points="1,2 3,4" style="color: rgb(1, 2, 3); border-color: rgb(1, 2, 3)"></helix-headless-map-route>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn[0]?.map((one) => one.casing)).toEqual(['rgb(250, 250, 250)', undefined])
  })

  test('a dotted route reaches the driver as dotted, and with no casing under its dots', async () => {
    const host = await frame(
      `<helix-headless-map-route label="The last steps" points="1,2 3,4" style="color: rgb(1, 2, 3); border-color: rgb(250, 250, 250)"></helix-headless-map-route>`,
    )
    const route = host.querySelector('helix-headless-map-route') as HTMLElement & {
      variant?: string
    }
    route.variant = 'dotted'
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(drawn[0]?.map(({ casing, pattern }) => ({ casing, pattern }))).toEqual([
      { casing: undefined, pattern: 'dotted' },
    ])
  })

  test('a route under way is cut at its progress, the part behind drawn quieter', async () => {
    const host = await frame(
      `<helix-headless-map-route label="Quarter" points="0,0 0,2" progress="0.25"></helix-headless-map-route>
       <helix-headless-map-route label="Done" points="0,0 0,2" progress="1"></helix-headless-map-route>
       <helix-headless-map-route label="Unstarted" points="0,0 0,2"></helix-headless-map-route>`,
    )
    const { driver, drawn } = layering()
    connectMap(host, driver)
    expect(
      drawn[0]?.map(({ faded, label, points }) => ({ faded: faded ?? false, label, points })),
    ).toEqual([
      {
        faded: true,
        label: 'Quarter',
        points: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 0.5 },
        ],
      },
      {
        faded: false,
        label: 'Quarter',
        points: [
          { lat: 0, lng: 0.5 },
          { lat: 0, lng: 2 },
        ],
      },
      {
        faded: true,
        label: 'Done',
        points: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 2 },
        ],
      },
      {
        faded: false,
        label: 'Unstarted',
        points: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 2 },
        ],
      },
    ])
    // The two halves of one route are told apart by id.
    expect(new Set(drawn[0]?.map((one) => one.id)).size).toBe(4)
  })

  test('a route moved, retoned or added is drawn again, under the same id, and disconnecting takes them off', async () => {
    const host = await frame(
      '<helix-headless-map-route label="R" points="1,2 3,4"></helix-headless-map-route>',
    )
    const { driver, drawn, stopped } = layering()
    const connection = connectMap(host, driver)
    const route = host.querySelector('helix-headless-map-route') as HTMLElement
    route.setAttribute('points', '1,2 3,4 5,6')
    await settle()
    route.setAttribute('tone', 'danger')
    await settle()
    host.insertAdjacentHTML(
      'beforeend',
      '<helix-headless-map-area label="Z" points="0,0 0,1 1,1"></helix-headless-map-area>',
    )
    await settle()
    // Drawn at first, again for the move and the tone, and again once the area arrived.
    expect(drawn.slice(0, 3).map((set) => set.length)).toEqual([1, 1, 1])
    expect(drawn.at(-1)?.map((one) => one.kind)).toEqual(['route', 'area'])
    expect(drawn[1]?.[0]?.points).toHaveLength(3)
    expect(new Set(drawn.map((set) => set[0]?.id)).size).toBe(1)
    connection.disconnect()
    expect(stopped).toEqual([true])
  })

  test('fitting frames every marker and every point of every route and area, at the pace of a trip', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="-1" lng="10"></helix-headless-map-marker>
       <helix-headless-map-route label="R" points="1,2 3,4"></helix-headless-map-route>`,
    )
    const { driver, fitted } = layering()
    const connection = connectMap(host, driver)
    connection.fit()
    connection.fit({ padding: 12 })
    expect(fitted).toEqual([
      '{"northEast":{"lat":3,"lng":10},"southWest":{"lat":-1,"lng":2}} 48 320ms',
      '{"northEast":{"lat":3,"lng":10},"southWest":{"lat":-1,"lng":2}} 12 320ms',
    ])
  })
})

describe('connectMap with a snapshot drawn on the server', () => {
  test('the snapshot stays until the renderer has drawn, and is then hidden', async () => {
    const host = await frame('<div data-helix-map-snapshot></div><div id="canvas"></div>')
    /* A duration of zero, which is a jump: the snapshot goes at once. */
    host.style.setProperty('--helix-duration-normal', '0ms')
    let done = (): void => undefined
    let stopped = false
    const { driver } = projecting()
    const connection = connectMap(host, {
      ...driver,
      ready: (heard) => {
        done = heard
        return () => {
          stopped = true
        }
      },
    })
    const snapshot = host.querySelector('[data-helix-map-snapshot]') as HTMLElement
    expect(snapshot.hidden).toBe(false)
    done()
    expect(snapshot.hidden).toBe(true)
    connection.disconnect()
    expect(stopped).toBe(true)
  })

  test('a frame with no snapshot does not wait for the renderer', async () => {
    const host = await frame('<div id="canvas"></div>')
    let asked = false
    const { driver } = projecting()
    connectMap(host, {
      ...driver,
      ready: () => {
        asked = true
        return () => undefined
      },
    })
    expect(asked).toBe(false)
  })
})

describe('connectMap with a position', () => {
  test('a position is stood where it is, turned its heading, and ringed as wide as its accuracy on the map', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="0" lng="2" heading="90" accuracy="111320"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    const read = (name: string): string => placedAt(position, `--_map-position-${name}`)
    /* North up, as a renderer draws it, so a heading is read the right way
       round from the line the connector projects. */
    const connection = connectMap(host, {
      ...projecting().driver,
      project: ({ lat, lng }) => ({ x: lng * 10, y: -lat * 10 }),
    })
    /* Ten pixels a degree, and 111,320 meters is a degree on the equator,
       where this driver's degrees are as long across as they are north. */
    expect([read('x'), read('y'), read('heading'), read('radius'), read('pitch')]).toEqual([
      '20px',
      '0px',
      '90deg',
      '10px',
      '0deg',
    ])

    position.setAttribute('lng', '3')
    position.setAttribute('heading', '180')
    await settle()
    expect([read('x'), read('heading')]).toEqual(['30px', '180deg'])

    connection.disconnect()
    expect(read('x')).toBe('')
  })

  test('on a tilted map it lies on the ground, its ring measured across the view', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="0" lng="2" accuracy="111320"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    const read = (name: string): string => placedAt(position, `--_map-position-${name}`)
    /* Turned to face east and tilted back: across the view is south, and a
       driver that shortened what runs away from the eye would still give the
       ring its whole width that way. */
    const { driver } = projecting()
    connectMap(host, {
      ...driver,
      bearing: () => 90,
      pitch: () => 50,
      /* Facing east, south is to the right and east is up, and up is what
         the tilt shortens. */
      project: ({ lat, lng }) => ({ x: -lat * 10, y: -lng * 10 * Math.cos((50 * Math.PI) / 180) }),
    })
    expect([read('pitch'), read('radius')]).toEqual(['50deg', '10px'])
  })

  test('its heading is drawn against the view, which a renderer can turn', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="1" lng="2" heading="90"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    /* Turned 30 degrees, as a renderer turned so is drawn: east on the
       ground is 30 degrees up from the right on the screen. */
    const turn = (30 * Math.PI) / 180
    const { driver } = projecting()
    connectMap(host, {
      ...driver,
      bearing: () => 30,
      project: ({ lat, lng }) => ({
        x: (lng * Math.cos(turn) - lat * Math.sin(turn)) * 10,
        y: -(lng * Math.sin(turn) + lat * Math.cos(turn)) * 10,
      }),
    })
    expect(placedAt(position, '--_map-position-heading')).toBe('60deg')
  })

  test('on a map drawn in perspective, it points along the line the renderer draws', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="0" lng="0" heading="0"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    /* North leans left as it runs up the screen, as a street at the right of
       a tilted view leans toward the horizon: one pixel left for every two
       up. Tilted 60 degrees, whose cosine is a half, the arrow's run up the
       screen is halved, so it is turned in the ground's plane less far, to
       the angle whose tangent is a quarter, and the tilt lands it on the
       line. */
    const { driver } = projecting()
    connectMap(host, {
      ...driver,
      pitch: () => 60,
      project: ({ lat, lng }) => ({ x: (lng - lat / 2) * 10, y: -lat * 10 }),
    })
    expect(placedAt(position, '--_map-position-heading')).toBe('-14.04deg')
  })

  test('a position moving, set as a property, moves it and draws no route again', async () => {
    const host = await frame(
      `<helix-headless-map-route label="R" points="0,0 1,1"></helix-headless-map-route>
       <helix-headless-map-position label="Van 12" lat="1" lng="2"></helix-headless-map-position>`,
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement & {
      lng: number
    }
    let draws = 0
    const { driver } = projecting()
    connectMap(host, {
      ...driver,
      layers: () => {
        draws += 1
        return { stop: () => {}, update: () => (draws += 1) }
      },
    })
    position.lng = 4
    await settle()
    expect(placedAt(position, '--_map-position-x')).toBe('40px')
    expect(draws).toBe(1)
  })

  test('fitting counts a position among the places to frame', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="0" lng="0"></helix-headless-map-marker>
       <helix-headless-map-position label="Van 12" lat="5" lng="6"></helix-headless-map-position>`,
    )
    const fitted: string[] = []
    connectMap(host, {
      fit: (bounds) => {
        fitted.push(JSON.stringify(bounds))
      },
      panBy: () => {},
      zoomBy: () => {},
    }).fit()
    expect(fitted).toEqual(['{"northEast":{"lat":5,"lng":6},"southWest":{"lat":0,"lng":0}}'])
  })
})

describe('connectMap with a frame that gathers its markers', () => {
  type Gathered = HTMLElement & {
    gathered: string[]
    gatheredBy: HTMLElement | undefined
    updateComplete: Promise<boolean>
  }

  /** Ten pixels a degree at first, and as many as a spec zooms it to after. */
  const zooming = (): { driver: MapDriver; fitted: string[]; zoom: (scale: number) => void } => {
    let scale = 10
    let heard = (): void => undefined
    const fitted: string[] = []
    return {
      driver: {
        fit: (bounds, padding) => {
          fitted.push(`${JSON.stringify(bounds)} ${padding}`)
        },
        onView: (moved) => {
          heard = moved
          return () => undefined
        },
        panBy: () => {},
        project: ({ lat, lng }) => ({ x: lng * scale, y: lat * scale }),
        zoomBy: () => {},
      },
      fitted,
      zoom: (next) => {
        scale = next
        heard()
      },
    }
  }

  const gathering = async (): Promise<{ host: Frame; places: Gathered[] }> => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-marker label="Ferry" lat="1" lng="2"></helix-headless-map-marker>
       <helix-headless-map-marker label="Mission" lat="10" lng="10"></helix-headless-map-marker>`,
    )
    ;(host as Frame & { cluster: boolean }).cluster = true
    await host.updateComplete
    return { host, places: [...host.querySelectorAll('helix-headless-map-marker')] as Gathered[] }
  }

  test('markers whose points would meet are drawn as one, at their middle, and come apart zoomed in', async () => {
    const { host, places } = await gathering()
    const [depot, ferry, mission] = places as [Gathered, Gathered, Gathered]
    const { driver, zoom } = zooming()
    connectMap(host, driver)
    expect(depot.gathered).toEqual(['Depot', 'Ferry'])
    expect(ferry.gatheredBy).toBe(depot)
    expect([mission.gathered, mission.gatheredBy]).toEqual([[], undefined])
    expect(placedAt(depot, '--_map-marker-x')).toBe('15px')

    zoom(100)
    expect(depot.gathered).toEqual([])
    expect(ferry.gatheredBy).toBeUndefined()
    expect(placedAt(depot, '--_map-marker-x')).toBe('100px')
  })

  test('a place on the far side of a globe is hidden, in no cluster, and still placed', async () => {
    const { host, places } = await gathering()
    const [depot, ferry, mission] = places as [
      Gathered & { behind: boolean },
      Gathered & { behind: boolean },
      Gathered & { behind: boolean },
    ]
    const { driver } = zooming()
    connectMap(host, { ...driver, behind: ({ lng }) => lng === 2 })
    expect([depot.behind, ferry.behind, mission.behind]).toEqual([false, true, false])
    expect(depot.gathered).toEqual([])
    expect(ferry.gatheredBy).toBeUndefined()
    expect(placedAt(ferry, '--_map-marker-x')).toBe('20px')
  })

  test('a place behind the globe that the keyboard reaches is turned into view', async () => {
    const { host, places } = await gathering()
    const shown: string[] = []
    const { driver } = zooming()
    connectMap(host, {
      ...driver,
      behind: ({ lng }) => lng === 2,
      show: ({ lat, lng }) => shown.push(`${lat},${lng}`),
    })
    places[1]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    places[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(shown).toEqual(['1,2'])
  })

  test('a cluster pressed is framed, unless the page answers it itself', async () => {
    const { host, places } = await gathering()
    const [depot] = places as [Gathered]
    const { driver, fitted } = zooming()
    const connection = connectMap(host, driver)
    await depot.updateComplete
    const press = (): void => {
      depot.shadowRoot
        ?.querySelector('[part="marker"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    }
    press()
    await settle()
    expect(fitted).toEqual(['{"northEast":{"lat":1,"lng":2},"southWest":{"lat":1,"lng":1}} 96'])
    connection.disconnect()
    connectMap(host, driver, { clusterZoom: false })
    await depot.updateComplete
    const heard: string[][] = []
    host.addEventListener('helix-map-cluster', (event) => heard.push(event.detail.labels))
    press()
    await settle()
    expect(fitted).toHaveLength(1)
    expect(heard).toEqual([['Depot', 'Ferry']])
  })

  test('a cluster of places a street apart is framed as tightly as they stand, which opens it', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-marker label="Ferry" lat="1.001" lng="1.001"></helix-headless-map-marker>`,
    )
    ;(host as Frame & { cluster: boolean }).cluster = true
    await host.updateComplete
    const [depot] = [...host.querySelectorAll('helix-headless-map-marker')] as Gathered[]
    const { driver, fitted } = zooming()
    connectMap(host, driver)
    await depot?.updateComplete
    expect(depot?.gathered).toEqual(['Depot', 'Ferry'])
    depot?.shadowRoot
      ?.querySelector('[part="marker"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await settle()
    expect(fitted).toEqual([
      '{"northEast":{"lat":1.001,"lng":1.001},"southWest":{"lat":1,"lng":1}} 96',
    ])
  })

  test('places at the very same spot fan out when pressed, rather than zooming, and fold back on Escape or a zoom', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Studio 1" lat="5" lng="5"></helix-headless-map-marker>
       <helix-headless-map-marker label="Studio 2" lat="5" lng="5"></helix-headless-map-marker>
       <helix-headless-map-marker label="Studio 3" lat="5" lng="5"></helix-headless-map-marker>`,
    )
    ;(host as Frame & { cluster: boolean }).cluster = true
    await host.updateComplete
    const studios = [...host.querySelectorAll('helix-headless-map-marker')] as (Gathered & {
      fanned: boolean
    })[]
    const [first] = studios as [Gathered & { fanned: boolean }]
    const { driver, fitted, zoom } = zooming()
    connectMap(host, driver)
    await first.updateComplete
    expect(first.gathered).toHaveLength(3)
    const at = (one: HTMLElement): string =>
      `${placedAt(one, '--_map-marker-x')} ${placedAt(one, '--_map-marker-y')}`
    first.shadowRoot
      ?.querySelector('[part="marker"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    // Round the spot, 50,50, the first at the top, and none of them framed.
    expect(fitted).toEqual([])
    expect(studios.map((one) => [one.fanned, one.gatheredBy, one.gathered.length])).toEqual([
      [true, undefined, 0],
      [true, undefined, 0],
      [true, undefined, 0],
    ])
    expect(at(first)).toBe('50px 10px')
    expect(new Set(studios.map(at)).size).toBe(3)
    expect(placedAt(first, '--_map-marker-leg')).toBe('40px')

    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    expect(studios.map((one) => one.fanned)).toEqual([false, false, false])
    expect(first.gathered).toHaveLength(3)

    first.shadowRoot
      ?.querySelector('[part="marker"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(first.fanned).toBe(true)
    zoom(12)
    expect(first.fanned).toBe(false)
    expect(first.gathered).toHaveLength(3)
  })

  test('a frame that does not gather draws every marker on its own', async () => {
    const host = await frame(
      `<helix-headless-map-marker label="Depot" lat="1" lng="1"></helix-headless-map-marker>
       <helix-headless-map-marker label="Ferry" lat="1" lng="1"></helix-headless-map-marker>`,
    )
    connectMap(host, zooming().driver)
    const [depot] = [...host.querySelectorAll('helix-headless-map-marker')] as Gathered[]
    expect(depot?.gathered).toEqual([])
  })
})

describe('connectMap with a points layer', () => {
  type Points = HTMLElement & { cluster: boolean; data?: unknown; updateComplete: Promise<boolean> }

  const collecting = (): {
    driver: MapDriver
    drawn: MapLayerSpec[][]
    press: (index: number) => void
    fitted: string[]
  } => {
    const drawn: MapLayerSpec[][] = []
    const fitted: string[] = []
    let events: Parameters<NonNullable<MapDriver['layers']>>[1]
    return {
      drawn,
      driver: {
        fit: (bounds) => {
          fitted.push(JSON.stringify(bounds))
        },
        layers: (read, heard) => {
          events = heard
          drawn.push(read())
          return { stop: () => {}, update: () => drawn.push(read()) }
        },
        panBy: () => {},
        zoomBy: () => {},
      },
      fitted,
      press: (index) => {
        const id = drawn.at(-1)?.find((one) => one.kind === 'points')?.id ?? ''
        events?.press(id, index)
      },
    }
  }

  test('points set as data are drawn as one layer, the same array while the data is, and a press says which', async () => {
    const host = await frame(
      '<helix-headless-map-points label="Cafés" cluster></helix-headless-map-points>',
    )
    const points = host.querySelector('helix-headless-map-points') as Points
    points.data = [
      { id: 'a', label: 'Cafe A', lat: 1, lng: 2 },
      { label: 'Cafe B', lat: 3, lng: 4 },
    ]
    await points.updateComplete
    const { driver, drawn, fitted, press } = collecting()
    const connection = connectMap(host, driver)
    const [spec] = drawn.at(-1) ?? []
    expect([spec?.kind, spec?.cluster, spec?.label, spec?.points]).toEqual([
      'points',
      true,
      'Cafés',
      [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ],
    ])
    points.setAttribute('class', 'retoned')
    await settle()
    expect(drawn.at(-1)?.[0]?.points).toBe(spec?.points)

    const said: string[] = []
    host.addEventListener('helix-activate', (event) => said.push(event.detail.value))
    press(0)
    press(1)
    expect(said).toEqual(['a', 'Cafe B'])

    connection.fit()
    expect(fitted).toEqual(['{"northEast":{"lat":3,"lng":4},"southWest":{"lat":1,"lng":2}}'])
  })

  test('points from a file are fetched once and drawn when they arrive', async () => {
    const asked: string[] = []
    const was = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      asked.push(url)
      return new Response(
        JSON.stringify({
          features: [
            {
              geometry: { coordinates: [2, 1], type: 'Point' },
              properties: { name: 'Cafe' },
              type: 'Feature',
            },
          ],
          type: 'FeatureCollection',
        }),
      )
    }) as typeof fetch
    try {
      const host = await frame(
        '<helix-headless-map-points label="Cafés" src="/cafes.geojson"></helix-headless-map-points>',
      )
      const { driver, drawn } = collecting()
      connectMap(host, driver)
      expect(drawn.at(-1)).toEqual([])
      await new Promise((done) => setTimeout(done, 10))
      expect(drawn.at(-1)?.[0]?.points).toEqual([{ lat: 1, lng: 2 }])
      expect(asked).toEqual(['/cafes.geojson'])
    } finally {
      globalThis.fetch = was
    }
  })
})

describe('connectMap walking a points layer', () => {
  test('what the renderer drew in view is walked in reading order once it settles, carried by a pan, and a count opened from the keyboard is zoomed in to', async () => {
    const host = await frame(
      '<helix-headless-map-points label="Cafés"></helix-headless-map-points>',
    )
    const points = host.querySelector('helix-headless-map-points') as HTMLElement & {
      data?: unknown
      updateComplete: Promise<boolean>
      walk: { count?: number; key: string; label?: string; x: number; y: number }[]
    }
    points.data = [
      { label: 'Low', lat: 9, lng: 1 },
      { label: 'High', lat: 1, lng: 5 },
    ]
    await points.updateComplete
    let events: Parameters<NonNullable<MapDriver['layers']>>[1]
    const expanded: string[] = []
    let offset = 0
    let moved = (): void => undefined
    connectMap(host, {
      layers: (read, heard) => {
        events = heard
        read()
        return {
          expand: (id, cluster) => expanded.push(`${id} ${cluster}`),
          inView: () => [
            { at: 0, place: { lat: 9, lng: 1 } },
            { cluster: 4, count: 30, place: { lat: 5, lng: 9 } },
            { at: 1, place: { lat: 1, lng: 5 } },
          ],
          stop: () => {},
          update: () => {},
        }
      },
      onView: (heard) => {
        moved = heard
        return () => undefined
      },
      panBy: () => {},
      project: ({ lat, lng }) => ({ x: lng * 10 + offset, y: lat * 10 }),
      zoomBy: () => {},
    })
    events?.settled?.()
    expect(points.walk.map((one) => [one.key, one.label ?? one.count, one.x])).toEqual([
      ['p:1', 'High', 50],
      ['c:4', 30, 90],
      ['p:0', 'Low', 10],
    ])
    offset = 5
    moved()
    expect(points.walk.map((one) => one.x)).toEqual([55, 95, 15])

    points.dispatchEvent(
      new CustomEvent('helix-map-cluster', { bubbles: true, detail: { key: 'c:4', labels: [] } }),
    )
    expect(expanded).toHaveLength(1)
    expect(expanded[0]).toMatch(/ 4$/)
  })
})

describe('connectMap with rotate and tilt', () => {
  test('the frame’s rotate and tilt reach the driver, and its bearing follows the view', async () => {
    const host = (await frame('')) as unknown as HTMLElement & {
      bearing: number
      faceNorth(): void
      pitch: number
      rotate(by: number): void
      tilt(by: number): void
      tiltTo(to: number): void
      updateComplete: Promise<boolean>
    }
    const asked: string[] = []
    let bearing = 30
    let pitch = 0
    const moved: (() => void)[] = []
    const connection = connectMap(host, {
      bearing: () => bearing,
      onView: (listener) => {
        moved.push(listener)
        return () => {}
      },
      panBy: () => {},
      pitch: () => pitch,
      rotate: (turn) => asked.push(`rotate ${JSON.stringify(turn)}`),
      tilt: (tilt) => asked.push(`tilt ${JSON.stringify(tilt)}`),
      zoomBy: () => {},
    })
    expect(host.bearing).toBe(30)
    host.rotate(15)
    host.faceNorth()
    host.tilt(-10)
    host.tiltTo(0)
    expect(asked).toEqual([
      'rotate {"by":15}',
      'rotate {"to":0}',
      'tilt {"by":-10}',
      'tilt {"to":0}',
    ])
    bearing = 45.04
    pitch = 49.96
    for (const listener of moved) {
      listener()
    }
    expect(host.bearing).toBe(45)
    expect(host.pitch).toBe(50)
    connection.disconnect()
    host.rotate(15)
    expect(asked).toHaveLength(4)
  })
})
