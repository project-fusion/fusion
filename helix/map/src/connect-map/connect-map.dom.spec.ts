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
    expect(slotted.textContent).toBe('Weather by Rain Co')
  })

  test('a renderer with nothing to credit slots nothing, until it has something', async () => {
    const host = await frame()
    const { driver, seen } = recorder()
    connectMap(host, driver)
    expect(credit(host)).toBeNull()
    seen.credits = ['Tiles']
    seen.changed?.()
    expect(credit(host)?.textContent).toBe('Tiles')
    seen.credits = []
    seen.changed?.()
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
    seen.changed?.()
    expect(credit(host)?.querySelector('a')).toBe(link)
    seen.credits = ['<a href="https://openfreemap.org">OpenFreeMap</a>']
    seen.changed?.()
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
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('30px')
    expect(marker.style.getPropertyValue('--_map-marker-y')).toBe('20px')
    moved()
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('35px')
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
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('10px')
    marker.setAttribute('lng', '4')
    await settle()
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('40px')
  })

  test('a marker with no place is left unplaced, which its sheet hides', async () => {
    const host = await frame(
      '<helix-headless-map-marker label="Nowhere"></helix-headless-map-marker>',
    )
    const { driver } = projecting()
    connectMap(host, driver)
    const marker = host.querySelector('helix-headless-map-marker') as HTMLElement
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('')
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
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('')
    moved()
    expect(marker.style.getPropertyValue('--_map-marker-x')).toBe('')
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

describe('connectMap with a position', () => {
  test('a position is stood where it is, turned its heading, and ringed as wide as its accuracy on the map', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="1" lng="2" heading="90" accuracy="111320"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    const read = (name: string): string =>
      position.style.getPropertyValue(`--_map-position-${name}`)
    const connection = connectMap(host, projecting().driver)
    // Ten pixels a degree, and 111,320 meters is a degree of latitude.
    expect([read('x'), read('y'), read('heading'), read('radius')]).toEqual([
      '20px',
      '10px',
      '90deg',
      '10px',
    ])

    position.setAttribute('lng', '3')
    position.setAttribute('heading', '180')
    await settle()
    expect([read('x'), read('heading')]).toEqual(['30px', '180deg'])

    connection.disconnect()
    expect(read('x')).toBe('')
  })

  test('its heading is drawn against the view, which a renderer can turn', async () => {
    const host = await frame(
      '<helix-headless-map-position label="Van 12" lat="1" lng="2" heading="90"></helix-headless-map-position>',
    )
    const position = host.querySelector('helix-headless-map-position') as HTMLElement
    const { driver } = projecting()
    connectMap(host, { ...driver, bearing: () => 30 })
    expect(position.style.getPropertyValue('--_map-position-heading')).toBe('60deg')
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
    expect(position.style.getPropertyValue('--_map-position-x')).toBe('40px')
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
