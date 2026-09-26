/**
 * A live map in the preview frame, loaded only when a render carries one.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason that file gives: the frame is sandboxed onto an opaque origin, and a
 * classic `<script src>` is the one kind of request from there that is not
 * CORS-checked. MapLibre loads the same way, as its own file, before this.
 *
 * **MapLibre's own file, not rebundled.** Its build makes its worker from a
 * blob at run time, which is the only worker an opaque origin may start: the
 * CSP build's worker is a file, and from `null` every file is another origin,
 * so the browser refuses it outright. Checked in the builder's real frame on
 * 26 Sep 2026. Rebundling the default build would put its worker source through
 * a second minifier for no gain, so it is copied as shipped.
 *
 * **Separate from `frame.js`** because most renders never draw a map: the
 * sandbox's examples and four of the builder's five layouts would carry
 * MapLibre's weight for nothing.
 */

import { connectMap, type MapColors, mapColorsFrom } from '@fusion.dev/helix-map'
import { mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { boundsOf, clearOf, sameColors } from '../utils/map-view/map-view'
import { RESTYLED } from './preview-events'

/** MapLibre, as its own script leaves it on the window. */
declare const maplibregl: typeof import('maplibre-gl')

/** MapLibre's stylesheet, inlined at build time. */
declare const __MAPLIBRE_CSS__: string

/** MapLibre's own stylesheet, once, since the canvas is positioned by it. */
const ensureStyles = (): void => {
  if (document.getElementById('preview-maplibre')) {
    return
  }
  const sheet = document.createElement('style')
  sheet.id = 'preview-maplibre'
  sheet.textContent = __MAPLIBRE_CSS__
  document.head.append(sheet)
}

/**
 * The contrast target the builder sent, which its labels are held to. The
 * compiler's own where none was sent, which is the sandbox's case.
 */
const contrastOf = (frame: Element): number | undefined => {
  const value = Number.parseFloat(
    getComputedStyle(frame).getPropertyValue('--themed-contrast-target'),
  )
  return Number.isFinite(value) ? value : undefined
}

/** A route's or an area's points, read from the attribute as the markup wrote it. */
const pointsOf = (layer: Element): { lat: number; lng: number }[] =>
  (layer.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))
    .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number }))

/** Where a marker stands, read from its attributes as the markup wrote them. */
const placeOf = (marker: Element): { lat: number; lng: number } | null => {
  const lat = Number(marker.getAttribute('lat'))
  const lng = Number(marker.getAttribute('lng'))
  return marker.hasAttribute('lat') && marker.hasAttribute('lng') ? { lat, lng } : null
}

/**
 * One map: the renderer made, connected to its frame, framed around its
 * markers clear of the panel, and redrawn when the theme moves.
 */
const mountOne = (frame: HTMLElement, root: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLElement>('[data-preview-map-canvas]')
  if (!box) {
    return () => undefined
  }
  /* Every place the map holds, a route's start among them, so a lane from a
     port off the edge of the markers' own bounds is framed whole. */
  const places = [
    ...[...frame.querySelectorAll('helix-map-marker, helix-map-position')].map(placeOf),
    ...[...frame.querySelectorAll('helix-map-route, helix-map-area')].flatMap(pointsOf),
  ].filter((place) => place !== null)
  const panel = root.querySelector('[data-preview-map-clear]')
  const bounds = places.length > 0 ? boundsOf(places) : undefined
  const language = document.documentElement.lang || 'en'
  let colors: MapColors = mapColorsFrom(frame)
  let contrast = contrastOf(frame)
  const map = new maplibregl.Map({
    attributionControl: false,
    container: box,
    style: mapLibreStyle(colors, { contrast, language }) as never,
    ...(bounds ? { bounds, fitBoundsOptions: { padding: clearOf(box, panel) } } : {}),
  })
  /* Framed again once it has drawn, and whenever the pane is resized: the
     frame is still settling its height when the map is made, and a resize
     keeps the center rather than the fit, so a reader dragging the builder's
     separator would push the places out of view. */
  const frameAround = (): void => {
    if (bounds) {
      map.fitBounds(bounds, { animate: false, padding: clearOf(box, panel) })
    }
  }
  map.once('load', frameAround)
  let fitting = 0
  const resized = new ResizeObserver(() => {
    cancelAnimationFrame(fitting)
    fitting = requestAnimationFrame(frameAround)
  })
  resized.observe(box)
  const connection = connectMap(frame, mapLibreDriver(map))

  /* **Only the latest colors, once a frame.** The builder can post a theme on
     every keystroke, and a restyle takes a few hundred milliseconds to settle
     on a software renderer: one pending at a time, and a restyle that would
     draw the same five colors is skipped. */
  let pending = 0
  const restyle = (): void => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => {
      const next = mapColorsFrom(frame)
      const target = contrastOf(frame)
      if (!sameColors(colors, next) || target !== contrast) {
        colors = next
        contrast = target
        map.setStyle(mapLibreStyle(colors, { contrast, language }) as never, { diff: true })
      }
    })
  }
  window.addEventListener(RESTYLED, restyle)

  return () => {
    window.removeEventListener(RESTYLED, restyle)
    cancelAnimationFrame(pending)
    cancelAnimationFrame(fitting)
    resized.disconnect()
    connection.disconnect()
    map.remove()
  }
}

window.helixPreviewMap = {
  mount(root) {
    ensureStyles()
    const unmounts = [...root.querySelectorAll<HTMLElement>('helix-map[data-preview-map]')].map(
      (frame) => mountOne(frame, root),
    )
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
