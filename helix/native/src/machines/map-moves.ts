/**
 * Where a phone's map looks, and how each control moves it: the view it
 * opens at, a step of zoom, a pan by a share of the box, a turn, a tilt, and
 * the words a screen reader hears once a move settles, as the web's frame
 * says them.
 */
import {
  aimOf,
  boundsOf,
  fitted,
  type MapAim,
  type MapPlace,
  type MapView,
  placeAt,
  WORLD_AIM,
} from '@fusion.dev/helix-core/map'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { wordsIn } from './date-picker-read'

/** Degrees a rotate button turns the map, as the web's. */
export const ROTATE_STEP = 15

/** The tilt the 3D button goes to, in degrees from looking straight down, as the web's. */
export const TILTED = 50

/** The most a map tilts, as MapLibre allows. */
const MOST_TILT = 60

/** The deepest and the widest a phone's map zooms. */
const DEEPEST = 20

/** The room a fit leaves at each edge, in points, clear of the controls' column. */
const FIT_ROOM = 40

/** Where a map opens: its `view`, or framed around every place it holds, or the whole world. */
export const openingAim = (
  written: string,
  places: readonly MapPlace[],
  width: number,
  height: number,
): MapAim => {
  const asked = aimOf(written)
  if (asked) {
    return asked
  }
  const bounds = boundsOf(places)
  return bounds ? fitted(bounds, width, height, FIT_ROOM) : WORLD_AIM
}

/** Which way a pan goes, in reading order. */
export type PanWay = 'down' | 'end' | 'start' | 'up'

/** What a move did, for the words said after it. */
export type Moved =
  | { readonly kind: 'pan'; readonly to: PanWay }
  | { readonly kind: 'tilt' | 'turn' | 'zoom' }

/** The aim a step of zoom in or out reaches. */
export const zoomed = (aim: MapAim, by: 1 | -1): MapAim => ({
  ...aim,
  zoom: Math.min(DEEPEST, Math.max(0, Math.round(aim.zoom) + by)),
})

/** The aim a pan by `share` of the box reaches, `start` to the right on a right-to-left page. */
export const panned = (
  aim: MapAim,
  to: PanWay,
  share: number,
  box: { readonly height: number; readonly width: number },
  rtl: boolean,
): MapAim => {
  const inline = (to === 'end' ? 1 : to === 'start' ? -1 : 0) * (rtl ? -1 : 1)
  const block = to === 'down' ? 1 : to === 'up' ? -1 : 0
  const view: MapView = { ...aim, height: box.height, width: box.width }
  const center = placeAt(
    view,
    box.width / 2 + inline * box.width * share,
    box.height / 2 + block * box.height * share,
  )
  return { ...aim, center }
}

/** The aim a turn by `by` degrees, or to `to`, reaches, kept within a turn. */
export const turned = (aim: MapAim, turn: { by?: number; to?: number }): MapAim => {
  const bearing = turn.to ?? (aim.bearing ?? 0) + (turn.by ?? 0)
  return { ...aim, bearing: ((((bearing + 180) % 360) + 360) % 360) - 180 }
}

/** The aim a tilt to `to` degrees reaches, within what MapLibre allows. */
export const tilted = (aim: MapAim, to: number): MapAim => ({
  ...aim,
  pitch: Math.min(MOST_TILT, Math.max(0, to)),
})

/** What a screen reader hears after a move, from the frame's own words. */
export const saidOf = (
  moved: Moved,
  aim: MapAim,
  read: (name: string) => unknown,
  lang: string,
): string => {
  const words = (name: string, values: Record<string, number> = {}) =>
    formatMessage(wordsIn(read(name)), values, lang)
  switch (moved.kind) {
    case 'zoom':
      return words('zoomed-label', { level: Math.round(aim.zoom) })
    case 'turn': {
      const degrees = Math.round(((aim.bearing ?? 0) + 360) % 360)
      return degrees === 0 ? words('north-label') : words('turned-label', { degrees })
    }
    case 'tilt': {
      const degrees = Math.round(aim.pitch ?? 0)
      return degrees === 0 ? words('flat-label') : words('tilted-label', { degrees })
    }
    default: {
      const name = {
        down: 'moved-down-label',
        end: 'moved-right-label',
        start: 'moved-left-label',
        up: 'moved-up-label',
      }[moved.to]
      return words(name)
    }
  }
}

/** The controls a page asked for, or the map's resting ones, as the web's frame reads `controls`. */
export const controlsOf = (written: string) => {
  const words = (written || 'zoom compass fullscreen').split(/\s+/)
  const has = (one: string) => words.includes(one)
  return {
    compassed: has('compass') || has('pan') || has('rotate'),
    layered: has('layers'),
    pans: has('pan'),
    rotates: has('rotate'),
    tilts: has('tilt'),
    zooms: has('zoom'),
  }
}
