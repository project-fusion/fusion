/**
 * The vector tiles a phone's still map draws its streets, water and land
 * from, where MapLibre Native is not in the app: the style's own TileJSON,
 * the tiles the view needs at its zoom, and each feature as a path through
 * MapLibre's camera, in the layers and colors the web's snapshot draws a
 * page's first paint in.
 *
 * **Each tile is drawn as it arrives**, as MapLibre draws one, and kept
 * for the moves after it. A tile that does not answer in time, or bytes
 * that are not a tile, leave that stretch the land's color.
 */
import {
  cssColor,
  type MapView,
  mix,
  parseColor,
  SNAPSHOT_LAYERS,
  type SnapshotLayer,
  type SnapshotTiles,
  snapshotDraws,
  snapshotPath,
  snapshotTiles,
  type TileLayer,
  tileAddress,
  type VectorTileLayers,
  vectorTile,
} from '@fusion.dev/helix-core/map'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { mapTileFetch } from '../capabilities/map-tiles'

/** How long a TileJSON or a tile may take, in milliseconds, before it is given up. */
const PATIENCE = 8000

/** The most tiles one view asks for, past which it asks at the zoom above. */
const MOST_TILES = 24

/** The most tiles kept read, the oldest let go first. */
const KEPT = 96

/** The tiles' layers the still picture reads. */
const READ = [...new Set(SNAPSHOT_LAYERS.map((layer) => layer.source))]

/** A TileJSON as far as the still picture reads one: the tiles' address and their deepest zoom. */
interface Source {
  readonly deepest: number
  readonly template: string
}

/** Asks for `url` within the patience, or `undefined` where nothing answers in time. */
const asked = async (url: string): Promise<Response | undefined> => {
  const fetch = mapTileFetch()
  if (fetch === undefined) {
    return undefined
  }
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), PATIENCE)
  try {
    return await fetch(url, { signal: control.signal })
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

const SOURCES = new Map<string, Promise<Source | undefined>>()

/** A TileJSON, asked once for every map that names it. */
const sourceOf = (url: string): Promise<Source | undefined> => {
  const had = SOURCES.get(url)
  if (had) {
    return had
  }
  const next = asked(url)
    .then((response) => (response?.ok ? response.json() : undefined))
    .then((json: { maxzoom?: unknown; tiles?: unknown } | undefined) => {
      const template = Array.isArray(json?.tiles) ? json.tiles[0] : undefined
      return typeof template === 'string'
        ? { deepest: typeof json?.maxzoom === 'number' ? json.maxzoom : 14, template }
        : undefined
    })
    .catch(() => undefined)
  /* A TileJSON that did not answer is asked again by the next map. */
  void next.then((source) => {
    if (source === undefined) {
      SOURCES.delete(url)
    }
  })
  SOURCES.set(url, next)
  return next
}

/** Each tile read, or `null` where it could not be, by its address, oldest first. */
const TILES = new Map<string, VectorTileLayers | null>()
const ASKING = new Set<string>()

/** Each still picture drawn, told when a tile arrives, whichever view asked for it. */
const WAITING = new Set<() => void>()

/** A tile, read once; a 404 is a tile with nothing in it, as the sea is. */
const tileOf = async (url: string): Promise<void> => {
  if (TILES.has(url) || ASKING.has(url)) {
    return
  }
  ASKING.add(url)
  const response = await asked(url)
  const bytes = response?.ok
    ? await response.arrayBuffer().catch(() => undefined)
    : response?.status === 404
      ? new ArrayBuffer(0)
      : undefined
  ASKING.delete(url)
  if (bytes === undefined) {
    return
  }
  let read: VectorTileLayers | null = null
  try {
    read = vectorTile(new Uint8Array(bytes), READ)
  } catch {
    read = null
  }
  TILES.set(url, read)
  for (const told of WAITING) {
    told()
  }
  while (TILES.size > KEPT) {
    const oldest = TILES.keys().next().value
    if (oldest === undefined) {
      break
    }
    TILES.delete(oldest)
  }
}

/** What the still picture draws of the tiles: each snapshot layer's path, bottom to top. */
export interface StillBase {
  readonly layer: SnapshotLayer
  readonly path: string
}

/** The tiles read so far, by address. */
type Read = ReadonlyMap<string, VectorTileLayers | null>

/** One tile's features of a layer, as paths. */
const layerPaths = (
  read: TileLayer | undefined,
  layer: SnapshotLayer,
  at: [number, number],
  view: MapView,
  covered: SnapshotTiles,
): string[] =>
  (read?.features ?? []).flatMap((feature) => {
    if (!snapshotDraws(layer, feature)) {
      return []
    }
    const path = snapshotPath(
      covered,
      view,
      feature.lines,
      at,
      read?.extent ?? 4096,
      layer.kind === 'fill',
      layer.smallest ?? 0,
    )
    return path === '' ? [] : [path]
  })

/** One tile's features of the layers shown, each as a path added to its layer's. */
const tileDrawn = (
  tile: VectorTileLayers,
  at: [number, number],
  view: MapView,
  covered: SnapshotTiles,
  shown: readonly SnapshotLayer[],
  drawn: Map<string, string[]>,
): void => {
  for (const layer of shown) {
    drawn.get(layer.id)?.push(...layerPaths(tile[layer.source], layer, at, view, covered))
  }
}

/** Each snapshot layer the view's zoom shows, as one path through the view's camera. */
const baseOf = (
  view: MapView,
  covered: SnapshotTiles,
  source: Source,
  roads: boolean,
  tiles: Read,
): StillBase[] => {
  const shown = SNAPSHOT_LAYERS.filter(
    (layer) => view.zoom >= (layer.minzoom ?? 0) && (roads || !layer.id.startsWith('road-')),
  )
  const drawn = new Map<string, string[]>(shown.map((layer) => [layer.id, []]))
  for (const at of covered.wanted) {
    const tile = tiles.get(tileAddress(source.template, covered.depth, at))
    if (tile) {
      tileDrawn(tile, at, view, covered, shown, drawn)
    }
  }
  return shown.flatMap((layer) => {
    const path = drawn.get(layer.id)?.join('') ?? ''
    return path === '' ? [] : [{ layer, path }]
  })
}

/** The TileJSON a style's tiles come from, asked once it is known. */
const useSource = (url: string | undefined): Source | undefined => {
  const [source, setSource] = useState<Source | undefined>(undefined)
  useEffect(() => {
    let live = true
    if (url !== undefined && mapTileFetch() !== undefined) {
      void sourceOf(url).then((found) => {
        if (live) {
          setSource(found)
        }
      })
    }
    return () => {
      live = false
    }
  }, [url])
  return source
}

/** The token each layer of the tiles moves the land toward. */
const TOWARD: Readonly<Record<SnapshotLayer['toward'], string>> = {
  foreground: 'color-foreground',
  info: 'color-info',
  primary: 'color-primary',
  success: 'color-success',
}

/** What the still picture is given of the tiles: their paths, and each layer's color. */
export interface StillGround {
  readonly base: readonly StillBase[]
  readonly colorOf: (layer: SnapshotLayer) => string
}

/**
 * The still picture's streets, water and land for a view, from the style's
 * own TileJSON, in the theme's colors: **nothing until the tiles answer**,
 * then each tile as it arrives. Roads are left out under the satellite map
 * type, as it leaves them out of MapLibre's style. **Only where `drawn`**:
 * a frame MapLibre Native draws asks for none.
 */
export const useStillGround = (
  asked: MapView | undefined,
  style: { readonly sources: Readonly<Record<string, unknown>> },
  mapType: string,
  ink: (token: string) => string,
  drawn: boolean,
): StillGround => {
  const view = drawn ? asked : undefined
  const url =
    view === undefined
      ? undefined
      : (style.sources.openmaptiles as { url?: string } | undefined)?.url
  const source = useSource(url)
  const [tiles, arrive] = useReducer(
    (): Read => new Map(TILES),
    TILES,
    (now): Read => new Map(now),
  )
  const covered = useMemo(
    () =>
      view === undefined || source === undefined
        ? undefined
        : snapshotTiles(view, source.deepest, MOST_TILES),
    [view, source],
  )
  useEffect(() => {
    WAITING.add(arrive)
    return () => {
      WAITING.delete(arrive)
    }
  }, [])
  useEffect(() => {
    if (covered !== undefined && source !== undefined) {
      for (const at of covered.wanted) {
        void tileOf(tileAddress(source.template, covered.depth, at))
      }
    }
  }, [covered, source])
  const roads = mapType !== 'satellite'
  const base = useMemo(
    () =>
      view === undefined || covered === undefined || source === undefined
        ? []
        : baseOf(view, covered, source, roads, tiles),
    [view, covered, source, roads, tiles],
  )
  const colorOf = useMemo(() => {
    const land = parseColor(ink('color-surface'))
    const fallback = ink('color-surface')
    return (layer: SnapshotLayer): string => {
      const toward = parseColor(ink(TOWARD[layer.toward]))
      return land === undefined || toward === undefined
        ? fallback
        : cssColor(mix(land, toward, layer.amount))
    }
  }, [ink])
  return { base, colorOf }
}
