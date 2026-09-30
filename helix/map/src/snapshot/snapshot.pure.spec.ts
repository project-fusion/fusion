import { describe, expect, test } from 'bun:test'
import { PbfWriter } from 'pbf'
import { mapLibreStyle } from '../style/map-style.js'
import { cssColor, mix, parseColor } from '../style/oklab.js'
import { cameraOf, worldOf } from './camera.js'
import { mapSnapshot, SNAPSHOT_LAYERS, widthAt } from './snapshot.js'

const COLORS = {
  foreground: '#111111',
  info: '#1d6fd8',
  primary: '#7c3aed',
  success: '#2f8a3b',
  surface: '#f7f7f7',
}

/** A layer of the style by its id, read without an unsafe chain. */
const styleLayer = (id: string): Record<string, unknown> => {
  const found = mapLibreStyle(COLORS).layers.find((layer) => layer.id === id)
  if (!found) {
    throw new Error(`the style has no layer \`${id}\``)
  }
  return found
}

/** The classes a style layer's filter matches, where it matches some. */
const classesIn = (filter: unknown): string[] | undefined => {
  if (!Array.isArray(filter)) {
    return undefined
  }
  const [head, subject, list] = filter as unknown[]
  if (
    head === 'match' &&
    Array.isArray(subject) &&
    subject[0] === 'get' &&
    subject[1] === 'class' &&
    Array.isArray(list)
  ) {
    return list as string[]
  }
  for (const part of filter as unknown[]) {
    const found = classesIn(part)
    if (found) {
      return found
    }
  }
  return undefined
}

describe('the camera', () => {
  test('a flat map is centered, a world pixel a screen pixel, and back again', () => {
    const view = { center: { lat: 30.27, lng: -97.74 }, height: 600, width: 800, zoom: 14 }
    const camera = cameraOf(view)
    const [cx, cy] = worldOf(view.center, camera.size)
    expect(camera.toScreen([cx, cy])).toEqual([400, 300])
    expect(camera.toScreen([cx + 10, cy - 5])).toEqual([410, 295])
    expect(camera.toWorld([410, 295])).toEqual([cx + 10, cy - 5])
  })

  test('tilted, what is far is drawn smaller than what is near, and the ground comes back', () => {
    const view = { center: { lat: 0, lng: 0 }, height: 600, pitch: 50, width: 800, zoom: 12 }
    const camera = cameraOf(view)
    const [cx, cy] = worldOf(view.center, camera.size)
    const [nearLeft, nearRight] = [
      camera.toScreen([cx - 50, cy + 50]),
      camera.toScreen([cx + 50, cy + 50]),
    ]
    const [farLeft, farRight] = [
      camera.toScreen([cx - 50, cy - 50]),
      camera.toScreen([cx + 50, cy - 50]),
    ]
    const across = (a?: [number, number], b?: [number, number]): number =>
      (b?.[0] ?? 0) - (a?.[0] ?? 0)
    expect(across(farLeft, farRight)).toBeLessThan(across(nearLeft, nearRight))
    const back = camera.toWorld(camera.toScreen([cx + 30, cy - 40]) ?? [0, 0])
    expect(back[0]).toBeCloseTo(cx + 30, 6)
    expect(back[1]).toBeCloseTo(cy - 40, 6)
  })

  test('turned to face east, what lies east is drawn up the screen', () => {
    const view = { bearing: 90, center: { lat: 0, lng: 0 }, height: 600, width: 800, zoom: 12 }
    const camera = cameraOf(view)
    const [cx, cy] = worldOf(view.center, camera.size)
    const [x, y] = camera.toScreen([cx + 100, cy]) ?? [0, 0]
    expect(x).toBeCloseTo(400, 6)
    expect(y).toBeCloseTo(200, 6)
  })
})

describe('the layers', () => {
  test('a width is widened between its zooms as MapLibre widens it, and held past them', () => {
    expect(
      widthAt(
        [
          [10, 1],
          [18, 9],
        ],
        8,
      ),
    ).toBe(1)
    expect(
      widthAt(
        [
          [10, 1],
          [18, 9],
        ],
        20,
      ),
    ).toBe(9)
    expect(
      widthAt(
        [
          [10, 1],
          [18, 9],
        ],
        14,
      ),
    ).toBeCloseTo(1 + (8 * (1.5 ** 4 - 1)) / (1.5 ** 8 - 1), 9)
  })

  test('each is the style’s layer of the same id: its color, its width, where it starts, and its classes', () => {
    const land = parseColor(COLORS.surface)
    for (const layer of SNAPSHOT_LAYERS) {
      const style = styleLayer(layer.id)
      const paint = style.paint as Record<string, unknown>
      const toward = parseColor(COLORS[layer.toward])
      if (!land || !toward) {
        throw new Error('a sample color did not parse')
      }
      const drawn = paint[layer.kind === 'fill' ? 'fill-color' : 'line-color']
      expect([layer.id, cssColor(mix(land, toward, layer.amount))]).toEqual([
        layer.id,
        String(drawn),
      ])
      expect([layer.id, layer.minzoom]).toEqual([layer.id, style.minzoom as number | undefined])
      expect([layer.id, layer.classes]).toEqual([layer.id, classesIn(style.filter)])
      if (layer.width) {
        const [, , , z0, w0, z1, w1] = paint['line-width'] as [
          unknown,
          unknown,
          unknown,
          number,
          number,
          number,
          number,
        ]
        expect([layer.id, layer.width]).toEqual([
          layer.id,
          [
            [z0, w0],
            [z1, w1],
          ],
        ])
      }
    }
  })
})

/* **A tile written by hand**, in the Mapbox Vector Tile encoding: a water
   polygon and a motorway across it, so the snapshot has something to draw
   and nothing to fetch. */
const tileOf = (): Uint8Array => {
  const pbf = new PbfWriter()
  const command = (id: number, count: number): number => (id & 7) | (count << 3)
  const zigzag = (n: number): number => (n << 1) ^ (n >> 31)
  const layers = [
    {
      features: [
        {
          geometry: [
            command(1, 1),
            zigzag(0),
            zigzag(0),
            command(2, 3),
            zigzag(4096),
            zigzag(0),
            zigzag(0),
            zigzag(2048),
            zigzag(-4096),
            zigzag(0),
            command(7, 1),
          ],
          tags: [],
          type: 3,
        },
      ],
      keys: [] as string[],
      name: 'water',
      values: [] as string[],
    },
    {
      features: [
        {
          geometry: [
            command(1, 1),
            zigzag(0),
            zigzag(3000),
            command(2, 1),
            zigzag(4096),
            zigzag(0),
          ],
          tags: [0, 0],
          type: 2,
        },
      ],
      keys: ['class'],
      name: 'transportation',
      values: ['motorway'],
    },
  ]
  for (const layer of layers) {
    pbf.writeMessage(
      3,
      (value: typeof layer, out: PbfWriter) => {
        out.writeVarintField(15, 2)
        out.writeStringField(1, value.name)
        for (const feature of value.features) {
          out.writeMessage(
            2,
            (f: typeof feature, into: PbfWriter) => {
              into.writePackedVarint(2, f.tags)
              into.writeVarintField(3, f.type)
              into.writePackedVarint(4, f.geometry)
            },
            feature,
          )
        }
        for (const key of value.keys) {
          out.writeStringField(3, key)
        }
        for (const text of value.values) {
          out.writeMessage(4, (t: string, into: PbfWriter) => into.writeStringField(1, t), text)
        }
        out.writeVarintField(5, 4096)
      },
      layer,
    )
  }
  return pbf.finish()
}

/** A tile server of one tile, the one over null island at zoom 14, which answers what it is asked. */
const serving = (asked: string[]): typeof fetch =>
  (async (input: string | URL | Request) => {
    const url = String(input)
    asked.push(url)
    if (url === 'https://tiles.test/tiles.json') {
      return Response.json({ maxzoom: 14, tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] })
    }
    if (url === 'https://tiles.test/14/8192/8191.pbf') {
      return new Response(new Uint8Array(tileOf()))
    }
    return new Response(null, { status: 404 })
  }) as typeof fetch

describe('mapSnapshot', () => {
  const view = { center: { lat: 0.005, lng: 0.01 }, height: 300, width: 400, zoom: 14 }

  test('draws the tiles in view in the page’s tokens, water under roads, a road as wide as the style draws it', async () => {
    const asked: string[] = []
    const svg = await mapSnapshot(view, {
      fetch: serving(asked),
      tiles: 'https://tiles.test/tiles.json',
    })
    expect(asked).toContain('https://tiles.test/14/8192/8191.pbf')
    expect(svg).toContain('data-helix-map-snapshot')
    expect(svg).toContain('aria-hidden="true"')
    /* The water is its whole shape, a triangle across the tile: its corners
       kept, a ring that closes on its start being measured from that start. */
    const shape = /var\(--helix-color-info\) 30%\)" d="([^"]*)"/.exec(svg)?.[1] ?? ''
    expect(shape.match(/l/g)?.length).toBeGreaterThanOrEqual(2)
    const water = svg.indexOf('var(--helix-color-info) 30%')
    const motorway = svg.indexOf('var(--helix-color-primary) 60%')
    expect(water).toBeGreaterThan(-1)
    expect(motorway).toBeGreaterThan(water)
    expect(svg).toContain(
      `stroke-width:${+widthAt(
        [
          [5, 0.5],
          [18, 18],
        ],
        14,
      ).toFixed(2)}px`,
    )
  })

  test('is nothing where the tiles cannot be read', async () => {
    const svg = await mapSnapshot(view, {
      fetch: serving([]),
      tiles: 'https://tiles.test/missing.json',
    })
    expect(svg).toBe('')
  })

  /* A snapshot missing a tile looks finished and is not, and a tile that is
     not a tile took the page down with it. */
  test('is nothing where a tile fails, or is not a tile, and never throws', async () => {
    const answering = (answer: () => Response): typeof fetch =>
      (async (input: string | URL | Request) =>
        String(input).endsWith('tiles.json')
          ? Response.json({ maxzoom: 14, tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] })
          : answer()) as typeof fetch
    const failed = await mapSnapshot(view, {
      fetch: answering(() => new Response(null, { status: 503 })),
      tiles: 'https://tiles.test/tiles.json',
    })
    const garbled = await mapSnapshot(view, {
      fetch: answering(() => new Response('<html>Too many requests</html>')),
      tiles: 'https://tiles.test/tiles.json',
    })
    expect([failed, garbled]).toEqual(['', ''])
  })

  test('is nothing where a request takes longer than it is given', async () => {
    /* A server that never answers and a fetch that never listens. */
    const hanging = (async (input: string | URL | Request) =>
      String(input).endsWith('tiles.json')
        ? Response.json({ maxzoom: 14, tiles: ['https://tiles.test/{z}/{x}/{y}.pbf'] })
        : new Promise<Response>(() => {})) as typeof fetch
    const svg = await mapSnapshot(view, {
      fetch: hanging,
      tiles: 'https://tiles.test/tiles.json',
      timeout: 50,
    })
    expect(svg).toBe('')
  })

  test('writes numbers into its markup and nothing else', async () => {
    const svg = await mapSnapshot(
      { ...view, width: '400" onload="alert(1)' as unknown as number },
      { fetch: serving([]), tiles: 'https://tiles.test/tiles.json' },
    )
    expect(svg).toBe('')
    const drawn = await mapSnapshot(
      { ...view, height: '300' as unknown as number },
      { fetch: serving([]), tiles: 'https://tiles.test/tiles.json' },
    )
    expect(drawn).toContain('height="300"')
  })

  /* Tiles overlap at their edges, and even-odd emptied every place two covered. */
  test('fills overlapping shapes whole', async () => {
    const svg = await mapSnapshot(view, {
      fetch: serving([]),
      tiles: 'https://tiles.test/tiles.json',
    })
    expect(svg).not.toContain('evenodd')
  })
})
