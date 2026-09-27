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

import { connectMap, mapColorsFrom } from '@fusion.dev/helix-map'
import { followTheme, mapLibreDriver, mapLibreStyle } from '@fusion.dev/helix-map/maplibre'
import { clearOf } from '../utils/map-view/map-view'
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

/**
 * One map: the renderer made, connected to its frame, framed around every
 * place it holds clear of the panel, and redrawn when the theme moves.
 */
const mountOne = (frame: HTMLElement, root: HTMLElement): (() => void) => {
  const box = frame.querySelector<HTMLElement>('[data-preview-map-canvas]')
  if (!box) {
    return () => undefined
  }
  const panel = root.querySelector('[data-preview-map-clear]')
  const language = document.documentElement.lang || 'en'
  /* A globe where the example asks for one with `data-preview-map-globe`. */
  const globe = frame.hasAttribute('data-preview-map-globe')
  const styled = (colors: ReturnType<typeof mapColorsFrom>) =>
    mapLibreStyle(colors, { contrast: contrastOf(frame), globe, language }) as never
  /* **A fixed view where the example gives one**, for a layer with no places
     to frame, such as buildings seen tilted or radar over a region. Written
     as `data-preview-map-view="lat,lng,zoom,pitch,bearing"`, the last two
     optional. */
  const [lat, lng, zoom, pitch = 0, bearing = 0] = (frame.dataset.previewMapView ?? '')
    .split(',')
    .map(Number)
  const view =
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom)
      ? { bearing, center: [lng, lat] as [number, number], pitch, zoom }
      : undefined
  const map = new maplibregl.Map({
    attributionControl: false,
    container: box,
    style: styled(mapColorsFrom(frame)),
    ...view,
  })
  const connection = connectMap(frame, mapLibreDriver(map))
  /* **Every place the map holds, framed at once**: its markers, its
     position and every point of its routes, so a lane from a port off the
     edge of the markers' own bounds is framed whole. Again once it has
     drawn, and whenever the pane is resized: the frame is still settling its
     height when the map is made, and a resize keeps the center rather than
     the fit, so a reader dragging the builder's separator would push the
     places out of view. */
  const frameAround = (): void => {
    if (view) {
      return
    }
    connection.fit({ animate: false, padding: clearOf(box, panel) })
  }
  frameAround()
  map.once('load', frameAround)
  let fitting = 0
  const resized = new ResizeObserver(() => {
    cancelAnimationFrame(fitting)
    fitting = requestAnimationFrame(frameAround)
  })
  resized.observe(box)

  /* **Only the latest theme, once a frame.** The builder can post a theme on
     every keystroke, and the frame says so after each one, which is a
     stylesheet replaced rather than anything a watch on the page would hear. */
  const theme = followTheme(map, frame, styled)
  window.addEventListener(RESTYLED, theme.update)

  return () => {
    window.removeEventListener(RESTYLED, theme.update)
    theme.stop()
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
