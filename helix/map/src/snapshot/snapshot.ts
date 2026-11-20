import {
  type MapView,
  SNAPSHOT_LAYERS,
  type SnapshotLayer,
  type SnapshotToward,
  snapshotDraws,
  snapshotPath,
  snapshotTiles,
  snapshotWidth,
  tileAddress,
} from '@fusion.dev/helix-core/map'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { type CreditPart, creditMarkup, creditParts } from '../credit/credit.js'

/** The Helix token each color is read from, as `mapColorsFrom` reads them. */
const TOKENS: Record<SnapshotToward | 'surface', string> = {
  foreground: '--helix-color-foreground',
  info: '--helix-color-info',
  primary: '--helix-color-primary',
  success: '--helix-color-success',
  surface: '--helix-color-surface',
}

/**
 * A layer's color as CSS, from the page's own tokens, so a snapshot is drawn
 * in whichever theme the page is in and follows it when it changes, with no
 * second picture for dark. OKLab, as the style mixes.
 */
const colorOf = (layer: SnapshotLayer): string =>
  `color-mix(in oklab, var(${TOKENS.surface}), var(${TOKENS[layer.toward]}) ${+(layer.amount * 100).toFixed(2)}%)`

/** What a snapshot is drawn from. */
export interface SnapshotOptions {
  /** The fetch the tiles are asked for with, where a server has its own, such as one that caches. */
  fetch?: typeof fetch | undefined
  /** How long each request may take, in milliseconds, before the snapshot is given up. 3000 by default. */
  timeout?: number | undefined
  /** A TileJSON URL for vector tiles in the OpenMapTiles schema: the one given to `mapLibreStyle`. OpenFreeMap's by default. */
  tiles?: string | undefined
}

/** A map drawn on the server, and the credit its tiles ask for. */
export interface MapSnapshot {
  /**
   * The tiles' credit, read from their TileJSON's `attribution`, as runs of
   * words and links: for a framework that writes `picture` in an element of
   * its own, and the credit in a `<span slot="attribution">` with
   * `data-helix-map-credit`. Empty where the tiles name none. For
   * OpenFreeMap's tiles, the default, it is OpenFreeMap's credit even where
   * their TileJSON does not answer in time.
   */
  credit: CreditPart[]
  /**
   * The picture, then the credit in the frame's `attribution` slot, as markup
   * to write in the frame after the element the renderer draws in. The credit
   * alone where the picture could not be drawn and the credit is known, and
   * an empty string where neither is known.
   */
  markup: string
  /** The picture alone, as markup. An empty string where it could not be drawn. */
  picture: string
}

/** What a snapshot that could not be drawn holds, made afresh so no caller shares it. */
const nothing = (): MapSnapshot => ({ credit: [], markup: '', picture: '' })

/** OpenFreeMap's TileJSON, which `mapLibreStyle` reads by default. */
const OPENFREEMAP = 'https://tiles.openfreemap.org/planet'

/**
 * The credit OpenFreeMap's TileJSON names, as it writes it, read on October
 * 11, 2026. **Written here for a TileJSON that does not answer in time**, so a
 * snapshot of OpenFreeMap's tiles carries the same credit whether or not its
 * TileJSON answered. A server that could not reach it within `timeout`
 * rendered the map with no credit, which the renderer in the browser wrote
 * only once it read the TileJSON itself.
 */
const OPENFREEMAP_CREDIT =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

export type { SnapshotLayer, SnapshotToward } from '@fusion.dev/helix-core/map'
export { SNAPSHOT_LAYERS, widthAt } from '@fusion.dev/helix-core/map'

/** The most tiles one snapshot asks for, past which it asks at the zoom above. */
const MOST_TILES = 40

/**
 * **A map drawn on the server, for the page's first paint**: an SVG of the
 * view a renderer is about to draw, from the same vector tiles and in the
 * same colors, so the map is there before the renderer has loaded. Put it in
 * the frame after the element the renderer draws in, since the renderer
 * paints its land before its tiles arrive; `connectMap` fades it out once
 * the renderer has drawn them. The frame's markers stand on it meanwhile.
 *
 * **Seen through the renderer's camera**, tilted and turned as the view
 * says, so the streets it draws lie under the streets the renderer draws.
 * It is drawn as a flat map, which is what a globe is at the zooms a page
 * opens a street map at: a view zoomed out past about 6 is a globe in the
 * renderer, and the picture would not match it.
 *
 * **Colored by the page's tokens**, each color written as the land moved
 * toward a token in OKLab, so it is drawn in whichever theme the page is in,
 * light or dark, and changes with it.
 *
 * **Credited from the first paint.** Most tile licenses require the credit
 * wherever the map is shown, and a frame showing the snapshot while the
 * renderer loads, or a page that never loads one, has no renderer's credit.
 * So the snapshot carries the credit the tiles' TileJSON names, and `markup`
 * writes it in the frame's `attribution` slot, marked as Helix's:
 * `connectMap` hides it once the renderer's credit is written, or at once
 * where the page slotted its own.
 *
 * **The picture is whole or nothing.** `picture` is an empty string where
 * any tile the view needs cannot be read in time, or the view is not
 * numbers, which a page renders as nothing and the renderer then draws. A
 * snapshot with a tile missing looks finished and is not, and one that waited
 * on a slow server held the page: each request is given `timeout`
 * milliseconds. A tile the server says it does not have, a 404, is drawn
 * empty, as the sea is.
 *
 * **The credit outlives a missing tile.** It is read from the TileJSON before
 * any tile is asked for, so a tile that fails costs the picture and keeps
 * the credit, and `markup` is then the credit alone. A page that wrote
 * nothing for a failed picture showed the map with no credit until the
 * renderer read its own, and a page that never loads one, never. Cache only a
 * snapshot whose `picture` is not empty.
 *
 * **OpenFreeMap's credit outlives its TileJSON.** Where the default tiles'
 * TileJSON does not answer in time, the snapshot carries the credit
 * OpenFreeMap names, the same credit the TileJSON gives. A snapshot of your
 * own tiles whose TileJSON does not answer carries no credit.
 */
export const mapSnapshot = async (
  asked: MapView,
  options: SnapshotOptions = {},
): Promise<MapSnapshot> => {
  /* **Numbers, and only numbers, reach the markup.** A page building the view
     from a request's query would otherwise write whatever it was sent into
     the SVG's attributes. */
  const view: MapView = {
    bearing: Number(asked.bearing ?? 0),
    center: { lat: Number(asked.center?.lat), lng: Number(asked.center?.lng) },
    height: Math.round(Number(asked.height)),
    pitch: Number(asked.pitch ?? 0),
    width: Math.round(Number(asked.width)),
    zoom: Number(asked.zoom),
  }
  if (
    ![view.bearing, view.center.lat, view.center.lng, view.pitch, view.zoom].every(
      Number.isFinite,
    ) ||
    !(view.width > 0 && view.height > 0)
  ) {
    return nothing()
  }
  const wait = options.timeout ?? 3000
  /* Raced against the clock as well as told to stop, so a fetch of the
     page's own that does not listen for the signal still gives up on time. */
  const get = (url: string): Promise<Response> => {
    const control = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    return Promise.race([
      (options.fetch ?? fetch)(url, { signal: control.signal }),
      new Promise<never>((_, refuse) => {
        timer = setTimeout(() => {
          control.abort()
          refuse(new Error(`${url} took longer than ${wait} ms`))
        }, wait)
      }),
    ]).finally(() => clearTimeout(timer))
  }
  const tileJson = options.tiles ?? OPENFREEMAP
  const tiles = await get(tileJson)
    .then((response) => (response.ok ? response.json() : undefined))
    .catch(() => undefined)
  const template = (tiles as { tiles?: string[] } | undefined)?.tiles?.[0]
  if (!template) {
    if (tileJson !== OPENFREEMAP) {
      return nothing()
    }
    const credit = creditParts([OPENFREEMAP_CREDIT])
    return { credit, markup: creditMarkup(credit), picture: '' }
  }
  const attribution = (tiles as { attribution?: unknown }).attribution
  const credit = typeof attribution === 'string' ? creditParts([attribution]) : []
  const deepest = (tiles as { maxzoom?: number }).maxzoom ?? 14
  /* **The zoom the tiles are asked at**: the view's, as deep as the tiles go,
     and shallower where a steep tilt reaches so far toward the horizon that
     the view would ask for more than `MOST_TILES`. */
  const covered = snapshotTiles(view, deepest, MOST_TILES)
  const { depth, wanted } = covered
  const drawn = new Map<string, string[]>(SNAPSHOT_LAYERS.map((layer) => [layer.id, []]))
  const shown = SNAPSHOT_LAYERS.filter((layer) => view.zoom >= (layer.minzoom ?? 0))

  let whole = true
  await Promise.all(
    wanted.map(async (at) => {
      const url = tileAddress(template, depth, at)
      const bytes = await get(url)
        .then((response) =>
          response.ok
            ? response.arrayBuffer()
            : response.status === 404
              ? new ArrayBuffer(0)
              : undefined,
        )
        .catch(() => undefined)
      if (!bytes) {
        whole = false
        return
      }
      /* A 200 that is not a tile, such as a rate limit's page, throws as it
         is read, and gives the snapshot up rather than the page. */
      try {
        drawTile(new VectorTile(new PbfReader(new Uint8Array(bytes))), at)
      } catch {
        whole = false
      }
    }),
  )

  function drawTile(tile: VectorTile, at: [number, number]): void {
    for (const layer of shown) {
      const source = tile.layers[layer.source]
      if (!source) {
        continue
      }
      for (let index = 0; index < source.length; index++) {
        const feature = source.feature(index)
        if (!snapshotDraws(layer, feature)) {
          continue
        }
        const path = snapshotPath(
          covered,
          view,
          feature.loadGeometry(),
          at,
          source.extent,
          layer.kind === 'fill',
          layer.smallest ?? 0,
        )
        if (path) {
          drawn.get(layer.id)?.push(path)
        }
      }
    }
  }

  if (!whole) {
    return { credit, markup: creditMarkup(credit), picture: '' }
  }
  const body = shown
    .map((layer) => {
      const paths = drawn.get(layer.id) ?? []
      if (paths.length === 0) {
        return ''
      }
      const color = colorOf(layer)
      return layer.kind === 'fill'
        ? /* **Nonzero, since tiles overlap.** A tile's polygons run past its
             edges and features overlap within one, and even-odd emptied every
             place two covered: a quarter of Austin's land cover drew as
             holes. A tile's holes wind the other way, and still cut out. */
          `<path style="fill:${color}" d="${paths.join('')}"/>`
        : `<path style="fill:none;stroke:${color};stroke-width:${+snapshotWidth(
            layer,
            view.zoom,
          ).toFixed(2)}px;stroke-linecap:round;stroke-linejoin:round" d="${paths.join('')}"/>`
    })
    .join('')
  const picture =
    `<div aria-hidden="true" data-helix-map-snapshot style="inset:0;overflow:hidden;pointer-events:none;position:absolute">` +
    `<svg height="${view.height}" viewBox="0 0 ${view.width} ${view.height}" width="${view.width}" xmlns="http://www.w3.org/2000/svg" style="background:var(${TOKENS.surface});left:50%;position:absolute;top:50%;translate:-50% -50%">` +
    `${body}</svg></div>`
  return { credit, markup: picture + creditMarkup(credit), picture }
}
