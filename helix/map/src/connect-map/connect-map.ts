import {
  HelixActivateEvent,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  isRtl,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { creditParts } from '../credit/credit.js'
import { type MapMotion, motionOf } from '../motion/motion.js'
import { type MapPoints, pointsFrom } from '../points/points.js'
import { settledColor } from '../style/map-colors.js'
import { watchTheme } from '../theme/watch-theme.js'

/**
 * What a renderer has to answer for the frame to drive it, and nothing that is
 * the same for every renderer: that is the connector's.
 *
 * **Physical pixels and a direction in, whatever the renderer calls them out.**
 * The frame asks in reading order and in fractions of the viewport, and the
 * connector turns that into pixels on screen before a driver sees it, so the
 * one thing every driver would otherwise get wrong on its own, which way
 * `start` is on a right-to-left page, is answered once.
 */
export interface MapDriver {
  /**
   * Which way the view is turned, in degrees clockwise from north, where the
   * renderer can turn it. A position's heading is drawn against it, so an
   * arrow pointing north still points north on a map turned east.
   */
  bearing?(): number
  /**
   * The renderer's credits as it writes them, which is markup, and a way to
   * hear them change. `stop` ends the listening and puts back anything the
   * driver hid to take the credit over, such as the renderer's own control.
   */
  credits?(changed: () => void): { read(): string[]; stop(): void }
  /**
   * The element the renderer made focusable, which the connector takes out of
   * the tab order while connected so the frame's region is the one stop.
   */
  focusTarget?(): HTMLElement | null
  /**
   * Frames a stretch of the world, its two corners in degrees, inset by
   * `padding` pixels from the view's edges, over the page's motion or at once.
   * What `connection.fit()` asks, to show every place the frame holds.
   */
  fit?(bounds: MapBounds, padding: MapPadding, motion: MapMotion | null): void
  /**
   * Draws the frame's routes and areas as the renderer's own layers, under its
   * place names where it has them. `read` is the whole set as it stands, its
   * colors settled, and a driver asks it every time it draws, including after
   * the renderer's style was replaced and took them with it. The connector
   * calls `update` when one is added, taken away or changed; `stop` takes
   * them off.
   */
  layers?(
    read: () => MapLayerSpec[],
    events?: MapLayerEvents,
  ): {
    /** Zooms in to where a points layer's count comes apart, at the page's pace. */
    expand?(id: string, cluster: number): void
    /** A points layer's points and counts drawn in view, which the keyboard walks. */
    inView?(id: string): MapInView[]
    stop(): void
    update(): void
  }
  /**
   * Hears the view move, every frame it moves, and returns what stops it. What
   * lets markers keep up with the map; without it they are placed once.
   */
  onView?(moved: () => void): () => void
  /**
   * Moves the view by this many CSS pixels, right and down positive, over the
   * page's own motion, or at once where it is `null`.
   */
  panBy(x: number, y: number, motion: MapMotion | null): void
  /**
   * Where a place falls in the map's box, in CSS pixels from its top left.
   * Without it markers cannot be placed, and the connector leaves them hidden.
   */
  project?(place: MapPlace): { x: number; y: number }
  /**
   * Takes off the renderer's own zoom buttons, which the frame's replace, and
   * returns what puts them back. Asked only where the frame draws its own.
   */
  replaceZoom?(): () => void
  /**
   * Turns the view by `by` degrees clockwise, or to the bearing `to`, over the
   * page's motion or at once. What the frame's rotate buttons and keys ask.
   */
  rotate?(
    turn: { by?: number | undefined; to?: number | undefined },
    motion: MapMotion | null,
  ): void
  /**
   * Turns the renderer's own keyboard handling off, and returns what turns it
   * back to how it was.
   */
  silenceKeyboard?(): () => void
  /** Brings a place to the middle of the view, at its zoom where it has one. */
  show?(place: MapPlace & { zoom?: number | undefined }, motion: MapMotion | null): void
  /**
   * Tilts the view `by` degrees toward the horizon, or back toward flat where
   * negative, or `to` a tilt, `0` being flat, within what the renderer allows.
   * What the frame's 3D and 2D buttons and tilt keys ask.
   */
  tilt?(tilt: { by?: number | undefined; to?: number | undefined }, motion: MapMotion | null): void
  /** Zooms one step in, `1`, or out, `-1`, by whatever a step is to this renderer. */
  zoomBy(direction: 1 | -1, motion: MapMotion | null): void
}

/** What a driver drawing layers tells the connector, and asks of it. */
export interface MapLayerEvents {
  /** The page's motion for a trip, for a cluster of points a press zooms in to. */
  motion(): MapMotion | null
  /** A reader pressed a point: which points layer, by its spec's `id`, and which of its points. */
  press(id: string, index: number): void
  /** The renderer has drawn what the view shows and gone still, which is when to ask what is in view. */
  settled?(): void
}

/** A point or a count a renderer drew in view. */
export interface MapInView {
  /** Which of the layer's points, where it is one. */
  at?: number | undefined
  /** The renderer's id for a count, where it is one. */
  cluster?: number | undefined
  /** How many places a count holds. */
  count?: number | undefined
  place: MapPlace
}

/** A place, in degrees. */
export interface MapPlace {
  lat: number
  lng: number
}

/** A stretch of the world by its south-west and north-east corners. */
export interface MapBounds {
  northEast: MapPlace
  southWest: MapPlace
}

/** How far in from each edge of the view, in CSS pixels, or one inset for all four. */
export type MapPadding = number | { bottom: number; left: number; right: number; top: number }

/**
 * A layer as a driver draws it, whatever renderer it drives: its kind, the
 * places it passes through or around, and its color settled to sRGB.
 */
export interface MapLayerSpec {
  /** A raster layer's credit for its tiles, which the frame shows with the map's own. */
  attribution?: string | undefined
  /**
   * A route's edge, drawn wider under it so it reads as laid over the roads
   * rather than as one of them, where the roads are drawn in the same brand;
   * the ring round each point of a points layer. Absent where there is none
   * to draw.
   */
  casing?: string | undefined
  /** Whether a points layer's points are gathered into their counts where they would meet. */
  cluster?: boolean | undefined
  /** `#hex`, `rgb()` or `rgba()`, which every renderer takes. */
  color: string
  /**
   * Drawn quieter: the part of a route already traveled, which the connector
   * cuts from the rest at the route's `progress`.
   */
  faded?: boolean | undefined
  /** Which of a raster layer's `frames` shows, counting from `0`. */
  frame?: number | undefined
  /** A raster layer's tile URLs, one per frame, each with `{z}`, `{x}`, and `{y}` in it. */
  frames?: readonly string[] | undefined
  /**
   * A raster layer drawn as the ground, such as imagery: under the roads and
   * place names, where other raster layers are over the roads.
   */
  ground?: boolean | undefined
  /** Stable for as long as the element is in the frame, for a renderer that keys its layers. */
  id: string
  /** What a points layer writes its counts in. */
  ink?: string | undefined
  kind: 'area' | 'buildings' | 'points' | 'raster' | 'route'
  /** What the frame's list calls it. */
  label: string
  /** A raster layer's deepest zoom with tiles, past which a renderer enlarges them. */
  maxZoom?: number | undefined
  /** How opaque a raster layer's tiles are, from `0` to `1`. */
  opacity?: number | undefined
  /**
   * How a route's line is drawn where it is not solid: `dotted` for a leg
   * off the network the rest is routed on, a place set back from its road.
   */
  pattern?: 'dotted' | undefined
  /**
   * In order: along a route, and around an area without repeating the first;
   * a points layer's every point, the same array for as long as its data is
   * the same, so a driver can tell a redraw that moved none of them.
   */
  points: MapPlace[]
}

/** What the connector reads off a marker, which is all it needs of one. */
interface Marker extends HTMLElement {
  /**
   * How far the marker reaches from its point along the line, name included,
   * in CSS pixels. Where it says, the connector turns the name to whichever
   * side of the point has the room.
   */
  extent?(): number
  /** The names of the places it stands for while it leads a cluster, its own first. */
  gathered?: string[]
  /** The marker standing for it while it is gathered into a cluster. */
  gatheredBy?: Marker | undefined
  /** Whether it stands fanned out from a place it shares with others, a leg back to it. */
  fanned?: boolean
  isMapMarker: true
  label?: string | undefined
  lat?: number | undefined
  lng?: number | undefined
  name?: string | undefined
  /** Which side of its point the name sits on, in reading order. */
  side?: 'end' | 'start'
}

/** The frame, as far as the connector reads it: whether it gathers its markers. */
interface Frame extends HTMLElement {
  cluster?: boolean | undefined
}

/**
 * How close a cluster's places may all be, in meters, before pressing it
 * fans them out where they are rather than zooming in: closer than a
 * renderer's deepest zoom draws apart, which is the same door or the same
 * building's addresses.
 */
const SAME_SPOT = 2

/**
 * Where each of `count` places fanned out from one point stands, in pixels
 * from it, `spacing` apart: a ring from the top, clockwise, for as many as
 * sit round one comfortably, and a spiral out from the middle for more, each
 * turn `spacing` further out, so a hundred take no more room than they need.
 */
const fanOut = (count: number, spacing: number): { x: number; y: number }[] => {
  if (count <= 8) {
    const radius = Math.max(spacing, (count * spacing) / (2 * Math.PI))
    return Array.from({ length: count }, (_, at) => {
      const angle = -Math.PI / 2 + (at * 2 * Math.PI) / count
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
    })
  }
  let angle = 0
  let length = spacing
  return Array.from({ length: count }, () => {
    angle += spacing / length
    length = spacing + (spacing / (2 * Math.PI)) * angle
    return {
      x: length * Math.cos(angle - Math.PI / 2),
      y: length * Math.sin(angle - Math.PI / 2),
    }
  })
}

/** Whether a cluster's names are the ones it already has, so it is not written again every frame. */
const sameNames = (had: readonly string[] | undefined, names: readonly string[]): boolean =>
  (had?.length ?? 0) === names.length && names.every((name, at) => had?.[at] === name)

const isMarker = (node: unknown): node is Marker =>
  (node as Partial<Marker> | null)?.isMapMarker === true

/** What the connector reads off a position. */
interface Position extends HTMLElement {
  /** In meters, which the ring is drawn as. */
  accuracy?: number | undefined
  /** In degrees clockwise from north. */
  heading?: number | undefined
  isMapPosition: true
  lat?: number | undefined
  lng?: number | undefined
}

const isPosition = (node: unknown): node is Position =>
  (node as Partial<Position> | null)?.isMapPosition === true

/** Meters in a degree of latitude, which is near enough constant for a ring. */
const METERS_PER_DEGREE = 111_320

/** What the connector reads off a route or an area. */
interface Layer extends HTMLElement {
  /** A raster layer's credit for its tiles. */
  attribution?: string | undefined
  /** A points layer's: whether its points gather into counts. */
  cluster?: boolean | undefined
  /** A points layer's data as a script set it. */
  data?: unknown
  /** A raster layer's frame shown, counting from `0`. */
  frame?: number | undefined
  /** A raster layer's tile URLs, one per frame. */
  frames?: string[] | undefined
  /** A raster layer's: drawn as the ground, under the roads. */
  ground?: boolean | undefined
  isMapLayer: true
  label?: string | undefined
  layerKind: 'area' | 'buildings' | 'points' | 'raster' | 'route'
  /** A raster layer's deepest zoom with tiles of its own. */
  maxZoom?: number | undefined
  /** A points layer's: the property each point is named by. */
  nameKey?: string | undefined
  /** A raster layer's opacity, from `0` to `1`. */
  opacity?: number | undefined
  points?: MapPlace[] | undefined
  /** A points layer's GeoJSON file, fetched where `data` is not set; a raster layer's one tile URL. */
  src?: string | undefined
  /** A points layer's points and counts in view, which the connector writes and the layer walks. */
  walk?: Walked[] | undefined
  progress?: number | undefined
  /** The styled route's line, which is dotted or solid. */
  variant?: string | undefined
}

/**
 * How far along a line each of its points is, in meters from the first:
 * degrees with longitude narrowed by the latitude, which is a flat map's idea
 * of length and near enough over a city.
 *
 * **The one measure of a route's progress.** A route is cut at its `progress`
 * by this, so a page moving something along the route measures with it too:
 * measured in plain degrees, a walker's share of the walk and the connector's
 * cut disagreed by up to a hundred meters, and the line under the walker was
 * still bright behind it.
 */
export const distancesAlong = (points: readonly MapPlace[]): number[] => {
  let total = 0
  return points.map((point, at) => {
    const from = points[at - 1]
    if (from) {
      total +=
        Math.hypot(
          point.lat - from.lat,
          (point.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180),
        ) * METERS_PER_DEGREE
    }
    return total
  })
}

/** A line cut at a fraction of its length, by `distancesAlong`, into the part behind and the part ahead, the cut point on both. */
const cut = (points: MapPlace[], fraction: number): [MapPlace[], MapPlace[]] => {
  const along = distancesAlong(points)
  const legs = along.slice(1).map((distance, at) => distance - (along[at] as number))
  let left = (along.at(-1) ?? 0) * fraction
  for (let at = 0; at < legs.length; at++) {
    const leg = legs[at] as number
    if (left <= leg) {
      const [from, to] = [points[at] as MapPlace, points[at + 1] as MapPlace]
      const part = leg > 0 ? left / leg : 0
      const middle = {
        lat: from.lat + (to.lat - from.lat) * part,
        lng: from.lng + (to.lng - from.lng) * part,
      }
      return [
        [...points.slice(0, at + 1), middle],
        [middle, ...points.slice(at + 1)],
      ]
    }
    left -= leg
  }
  return [points, []]
}

/** A point or a count in view as a points layer walks it. */
interface Walked {
  count?: number | undefined
  key: string
  label?: string | undefined
  value?: string | undefined
  x: number
  y: number
}

/** The most points and counts a layer walks: past it, a reader zooms in or the layer clusters. */
const WALKED = 100

/** Whether a walk is the one a layer already has, to the pixel, so it is not written again. */
const sameWalk = (had: readonly Walked[] | undefined, walk: readonly Walked[]): boolean =>
  (had?.length ?? 0) === walk.length &&
  walk.every((one, at) => {
    const was = had?.[at]
    return (
      was?.key === one.key &&
      Math.round(was.x) === Math.round(one.x) &&
      Math.round(was.y) === Math.round(one.y) &&
      was.label === one.label &&
      was.count === one.count
    )
  })

const isLayer = (node: unknown): node is Layer =>
  (node as Partial<Layer> | null)?.isMapLayer === true

/** Each layer's id, kept as long as the element is. */
const ids = new WeakMap<Element, string>()
let minted = 0
const idOf = (element: Element): string => {
  let id = ids.get(element)
  if (!id) {
    minted += 1
    id = `helix-layer-${minted}`
    ids.set(element, id)
  }
  return id
}

/** How a connection is made, where the defaults are not wanted. */
export interface ConnectOptions {
  /**
   * Whether the renderer's credit fills the frame's `attribution` slot. On by
   * default, and left alone either way where the page slotted its own.
   */
  credit?: boolean | undefined
  /**
   * How close two markers' points may come on screen, in CSS pixels, before
   * a frame that gathers its markers draws them as one. 40 by default, about
   * where two points and their names begin to draw over each other.
   */
  clusterDistance?: number | undefined
  /**
   * Whether pressing a cluster zooms in to its places. On by default; off for
   * a page that answers `helix-map-cluster` itself, listing them in a panel.
   */
  clusterZoom?: boolean | undefined
  /**
   * Who answers the arrow keys: the frame, whose region is the tab stop, or
   * the renderer's own handler, which is the way back for a view that wants
   * the renderer's rotate and pitch. `frame` by default.
   */
  keyboard?: 'frame' | 'renderer' | undefined
}

/** A connection, which is ended rather than left to leak. */
export interface MapConnection {
  /** Stops answering the frame and puts back everything connecting changed. */
  disconnect(): void
  /**
   * Frames every place the frame holds, its markers and every point of its
   * routes and areas, inset by `padding`, 48 pixels by default, at the page's
   * pace for a trip, or at once with `animate: false`, which is what framing
   * a map that is still settling its size wants. Nothing where the frame
   * holds no place or the driver cannot frame.
   */
  fit(options?: { animate?: boolean | undefined; padding?: MapPadding | undefined }): void
}

/** Where the connector writes the renderer's credit, so it can find its own. */
const CREDIT = 'data-helix-map-credit'

/** The box the map is drawn in, which a pan is a fraction of. */
const viewportOf = (frame: HTMLElement): { width: number; height: number } => {
  const box = (
    frame.shadowRoot?.querySelector('[part="viewport"]') ?? frame
  ).getBoundingClientRect()
  return { height: box.height, width: box.width }
}

/**
 * Connects a Map frame to a renderer through its driver.
 *
 * **Everything that is the same for every renderer happens here**, once:
 * `helix-map-pan` and `helix-map-zoom` answered in pixels and a direction, with
 * no motion where the reader asked for none; the renderer's keyboard handler
 * silenced and its canvas taken out of the tab order, so a reader meets one
 * named stop and one set of keys rather than the frame and an unnamed canvas
 * that answers differently; the renderer's own zoom buttons taken off where
 * the frame draws its own; the frame's markers stood on their places as the
 * view moves, and brought into view as the keyboard reaches them; and the
 * renderer's credit written into the frame's
 * `attribution` slot as text and links, kept current as its sources change.
 *
 * The frame is `helix-map` or `helix-headless-map`, and the driver is
 * `mapLibreDriver`, `leafletDriver` or one of the page's own.
 */
export const connectMap = (
  frame: HTMLElement,
  driver: MapDriver,
  options: ConnectOptions = {},
): MapConnection => {
  const handlePan = (event: Event): void => {
    const { by, to } = (event as CustomEvent<ViewportPanDetail>).detail
    const { height, width } = viewportOf(frame)
    /* `start` and `end` are the way text runs, which a right-to-left page
       reverses, and a renderer only knows left and right. */
    const inline = (to === 'end' ? 1 : to === 'start' ? -1 : 0) * (isRtl(frame) ? -1 : 1)
    const block = to === 'down' ? 1 : to === 'up' ? -1 : 0
    driver.panBy(inline * width * by, block * height * by, motionOf(frame, 'step'))
  }
  const handleZoom = (event: Event): void => {
    const { by } = (event as CustomEvent<ViewportZoomDetail>).detail
    if (by !== 0) {
      driver.zoomBy(by > 0 ? 1 : -1, motionOf(frame, 'step'))
    }
  }
  frame.addEventListener(HelixMapPanEvent.eventName, handlePan)
  frame.addEventListener(HelixMapZoomEvent.eventName, handleZoom)
  /* **Rotate and tilt, where the renderer can.** A driver without them, such
     as Leaflet's, which draws flat, leaves the buttons doing nothing. */
  const handleRotate = (event: Event): void => {
    const { by, to } = (event as CustomEvent<{ by?: number; to?: number }>).detail
    driver.rotate?.({ by, to }, motionOf(frame, 'step'))
  }
  const handleTilt = (event: Event): void => {
    const { by, to } = (event as CustomEvent<{ by?: number; to?: number }>).detail
    driver.tilt?.({ by, to }, motionOf(frame, 'step'))
  }
  frame.addEventListener(HelixMapRotateEvent.eventName, handleRotate)
  frame.addEventListener(HelixMapTiltEvent.eventName, handleTilt)
  /* The frame's `bearing` follows the view, so its Face north needle points
     north as the map turns. Rounded, so a still map writes nothing. */
  const holder = frame as HTMLElement & { bearing?: number }
  const syncBearing = (): void => {
    const bearing = Math.round((driver.bearing?.() ?? 0) * 10) / 10
    if ('bearing' in holder && holder.bearing !== bearing) {
      holder.bearing = bearing
    }
  }
  syncBearing()
  const stopBearing = driver.bearing ? driver.onView?.(syncBearing) : undefined

  const restoreKeyboard = options.keyboard === 'renderer' ? undefined : driver.silenceKeyboard?.()

  /* One set of zoom buttons: the renderer's go while the frame draws its
     own, and stay where a page turned the frame's off. */
  const restoreZoom = frame.shadowRoot?.querySelector('[part~="zoom-in"]')
    ? driver.replaceZoom?.()
    : undefined

  /* Out of the tab order, and back to exactly what it was: a renderer that
     wrote `tabindex="0"` gets `0` back, one that wrote nothing gets nothing. */
  const focusable = options.keyboard === 'renderer' ? null : (driver.focusTarget?.() ?? null)
  const tabindex = focusable?.getAttribute('tabindex') ?? null
  focusable?.setAttribute('tabindex', '-1')

  /* The page's own credit wins: a frame that arrived with one slotted is
     one whose credit somebody is already keeping. */
  const owned = [...frame.children].some(
    (child) => child.getAttribute('slot') === 'attribution' && !child.hasAttribute(CREDIT),
  )
  let credit: HTMLElement | undefined
  let listening: { read(): string[]; stop(): void } | undefined
  /* **What the credit last said, so saying it again writes nothing.** A
     renderer reports a source changed for every tile it loads and every time
     a route is redrawn, and rebuilding the links each time took a reader's
     focus off the one they had tabbed to. */
  let written: string | undefined
  const writeCredit = (): void => {
    if (!listening || !credit) {
      return
    }
    const parts = creditParts(listening.read())
    const said = JSON.stringify(parts)
    if (said === written) {
      return
    }
    written = said
    const nodes = parts.map((part) => {
      if (part.href === undefined) {
        return document.createTextNode(part.text)
      }
      const link = document.createElement('a')
      link.href = part.href
      link.rel = 'noopener noreferrer'
      link.target = '_blank'
      /* Helix's own helper for a link in the text's own color, so a credit
         says who made the map without being the brightest thing under it. */
      link.dataset.link = 'quiet'
      link.textContent = part.text
      return link
    })
    credit.replaceChildren(...nodes)
    /* Slotted only while it says something: the strip draws its hairline on
       what is slotted, so an empty credit was an empty strip with a line
       over it, and `hidden` loses to the strip's own `display`. */
    if (nodes.length === 0) {
      credit.remove()
    } else if (credit.parentNode !== frame) {
      frame.append(credit)
    }
  }
  if (options.credit !== false && !owned && driver.credits) {
    credit = document.createElement('span')
    credit.setAttribute('slot', 'attribution')
    credit.setAttribute(CREDIT, '')
    listening = driver.credits(writeCredit)
    writeCredit()
  }

  /* **Markers, stood on their places every time the view moves.** Written as
     custom properties on each marker, which its stylesheet reads, the way a
     canvas places its cards. A marker off the edge is still placed and the
     viewport clips it, so one scrolled back into view is already there. */
  const markers = (): Marker[] => [...frame.children].filter(isMarker)
  /* Each cluster by the marker drawn for it, as the last placing gathered them. */
  let clusters = new Map<Marker, Marker[]>()
  /* **The places fanned out from one spot**, by the spot and how many pixels
     ten meters were when they fanned: a zoom changes that, and closes them,
     since the cluster may have come apart or grown; a pan does not, and the
     fan moves with the map. */
  let fanned: { members: Marker[]; place: MapPlace; scale: number } | undefined
  const scaleOf = (place: MapPlace): number => {
    if (!driver.project) {
      return 0
    }
    const at = driver.project(place)
    const north = driver.project({ lat: place.lat + 10 / METERS_PER_DEGREE, lng: place.lng })
    return Math.hypot(north.x - at.x, north.y - at.y)
  }
  const positions = (): Position[] => [...frame.children].filter(isPosition)
  /* **A route needs two points and an area three**, and one with fewer is a
     layer still being written rather than a shape to draw: MapLibre refuses a
     one-point line outright. */
  /* **A points layer's data, fetched once per file and read once per set.**
     Its file is asked for the first time it is drawn and drawn again when it
     arrives; its places are read from the data once, and the same array
     handed on until the data or the name key changes, so a redraw for a
     color is not thousands of points parsed again and sent to a worker. */
  const fetched = new WeakMap<Layer, { data?: unknown; src: string }>()
  const read = new WeakMap<Layer, { data: unknown; nameKey: string; points: MapPoints }>()
  const dataOf = (layer: Layer): unknown => {
    if (layer.data !== undefined || !layer.src) {
      return layer.data
    }
    const had = fetched.get(layer)
    if (had?.src === layer.src) {
      return had.data
    }
    const asked: { data?: unknown; src: string } = { src: layer.src }
    fetched.set(layer, asked)
    fetch(layer.src)
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error(`${asked.src}: ${response.status}`)),
      )
      .then((data: unknown) => {
        if (fetched.get(layer) === asked && live) {
          asked.data = data
          soon({ draw: true })
        }
      })
      .catch((error: unknown) => console.error(error))
    return undefined
  }
  const pointsOf = (layer: Layer): MapPoints => {
    const data = dataOf(layer)
    const nameKey = layer.nameKey ?? 'name'
    const had = read.get(layer)
    if (had && had.data === data && had.nameKey === nameKey) {
      return had.points
    }
    const points = pointsFrom(data, nameKey)
    read.set(layer, { data, nameKey, points })
    return points
  }
  /* Each points layer by its spec's id, for a press to find its element. */
  const pointLayers = new Map<string, Layer>()
  /* **What each points layer walks**, asked of the renderer when it goes
     still: in reading order, top to bottom and along each line the way text
     runs, at most `WALKED` of them, each by a key that stays its own while it
     stays in view. */
  let seen = new Map<Layer, (Omit<Walked, 'x' | 'y'> & { place: MapPlace })[]>()
  const look = (): void => {
    if (!live || !drawn?.inView || !driver.project) {
      return
    }
    const project = driver.project
    const rtl = isRtl(frame)
    const next = new Map<Layer, (Omit<Walked, 'x' | 'y'> & { place: MapPlace })[]>()
    for (const [id, layer] of pointLayers) {
      if (layer.parentElement !== frame) {
        continue
      }
      const { names, values } = pointsOf(layer)
      const found = drawn.inView(id).map((one) => ({ at: project(one.place), one }))
      found.sort((a, b) => a.at.y - b.at.y || (rtl ? b.at.x - a.at.x : a.at.x - b.at.x))
      next.set(
        layer,
        found.slice(0, WALKED).map(({ one }) =>
          one.cluster !== undefined
            ? { count: one.count ?? 0, key: `c:${one.cluster}`, place: one.place }
            : {
                key: `p:${one.at}`,
                label: names[one.at ?? -1] || undefined,
                place: one.place,
                value: values[one.at ?? -1],
              },
        ),
      )
    }
    for (const layer of seen.keys()) {
      if (!next.has(layer) && (layer.walk?.length ?? 0) > 0) {
        layer.walk = []
      }
    }
    seen = next
    place()
  }
  /* **A hidden layer is not drawn**, which is how the frame's layers menu
     turns one off, and how a page can. */
  const readLayers = (): MapLayerSpec[] =>
    [...frame.children]
      .filter(isLayer)
      .filter((layer) => !(layer as HTMLElement).hidden)
      .flatMap((layer): MapLayerSpec[] => {
        const color = settledColor(layer)
        /* **Buildings are the tiles' own**, raised by the renderer, so the
           spec carries only their color. */
        if (layer.layerKind === 'buildings') {
          return [
            { color, id: idOf(layer), kind: 'buildings', label: layer.label ?? '', points: [] },
          ]
        }
        /* **A raster layer is its tile URLs and the one shown**, `src` being a
           layer of one frame. The last frame shows until one is chosen. */
        if (layer.layerKind === 'raster') {
          const frames = layer.frames?.length ? [...layer.frames] : layer.src ? [layer.src] : []
          if (frames.length === 0) {
            return []
          }
          const last = frames.length - 1
          return [
            {
              ...(layer.attribution ? { attribution: layer.attribution } : {}),
              color,
              frame: Math.min(Math.max(0, layer.frame ?? last), last),
              frames,
              ...(layer.ground ? { ground: true } : {}),
              id: idOf(layer),
              kind: 'raster',
              label: layer.label ?? '',
              ...(typeof layer.maxZoom === 'number' ? { maxZoom: layer.maxZoom } : {}),
              opacity: Math.min(Math.max(0, layer.opacity ?? 0.7), 1),
              points: [],
            },
          ]
        }
        /* **Points are drawn from their data**, ringed in the border's color
           and counted in the outline's. */
        if (layer.layerKind === 'points') {
          const { points } = pointsOf(layer)
          if (points.length === 0) {
            return []
          }
          const id = idOf(layer)
          pointLayers.set(id, layer)
          return [
            {
              casing: settledColor(layer, 'border-top-color'),
              cluster: layer.cluster === true,
              color,
              id,
              ink: settledColor(layer, 'outline-color'),
              kind: 'points',
              label: layer.label ?? '',
              points,
            },
          ]
        }
        if ((layer.points?.length ?? 0) < (layer.layerKind === 'area' ? 3 : 2)) {
          return []
        }
        /* **The edge is the element's border color**, which the styled tier
           sets to the surface and a page can set to anything; where it is the
           route's own color, which is what an unstyled element's border is,
           there is no casing to draw. */
        const edge = layer.layerKind === 'route' ? settledColor(layer, 'border-top-color') : color
        /* A dotted leg takes no casing: an edge under a line of dots is a
           dashed band, not a line of dots. */
        const dotted = layer.layerKind === 'route' && layer.variant === 'dotted'
        const spec: MapLayerSpec = {
          ...(edge && edge !== color && !dotted ? { casing: edge } : {}),
          color,
          id: idOf(layer),
          kind: layer.layerKind,
          label: layer.label ?? '',
          ...(dotted ? { pattern: 'dotted' as const } : {}),
          points: (layer.points ?? []).map(({ lat, lng }) => ({ lat, lng })),
        }
        /* **A route under way is two lines**, the part behind drawn quieter,
           cut at its progress: none of it behind draws it whole, and all of
           it behind draws it all quieter. */
        const progress = layer.layerKind === 'route' ? layer.progress : undefined
        if (typeof progress !== 'number' || progress <= 0) {
          return [spec]
        }
        if (progress >= 1) {
          return [{ ...spec, faded: true }]
        }
        const [behind, ahead] = cut(spec.points, progress)
        return [
          { ...spec, faded: true, id: `${spec.id}-behind`, points: behind },
          { ...spec, points: ahead },
        ]
      })
  /* **A point pressed is a place pressed**, reported as a marker's press is,
     from the points layer it belongs to, with its id or its name. */
  const drawn = driver.layers?.(readLayers, {
    motion: () => motionOf(frame, 'travel'),
    press: (id, index) => {
      const layer = pointLayers.get(id)
      const value = layer ? pointsOf(layer).values[index] : undefined
      if (layer && value !== undefined) {
        layer.dispatchEvent(new HelixActivateEvent({ value }))
      }
    },
    settled: () => look(),
  })
  const place = (): void => {
    if (!driver.project) {
      return
    }
    const project = driver.project
    const { width } = viewportOf(frame)
    const rtl = isRtl(frame)
    const bearing = driver.bearing?.() ?? 0
    /* **Every measure first, then every write.** A marker's reach is its
       button's width, which asking for flushes layout, and asked between one
       marker's move and the next it laid the page out once per marker on
       every frame of a pan. Read together, it is laid out once, and what is
       read does not depend on where anything stands. */
    const standing = markers()
      .filter((marker) => typeof marker.lat === 'number' && typeof marker.lng === 'number')
      .map((marker) => ({
        at: project({ lat: marker.lat as number, lng: marker.lng as number }),
        marker,
        reach: typeof marker.extent === 'function' ? marker.extent() : undefined,
      }))
    /* **Gathered where they would draw over each other**, on a frame that
       asks for it: each marker, in the order they are written, takes every
       later one standing near enough to its point, and is drawn at their
       middle as their count, named by their names. Asked again every time the
       view moves, so a cluster comes apart as the map zooms in to where its
       places have room, and the first of each keeps the walk's order. */
    const gathering = (frame as Frame).cluster === true
    /* A marker with no place is in no cluster. */
    for (const marker of markers()) {
      if (!standing.some((one) => one.marker === marker) && marker.gatheredBy !== undefined) {
        marker.gatheredBy = undefined
      }
    }
    const reach = options.clusterDistance ?? 40
    if (fanned) {
      const scale = scaleOf(fanned.place)
      const members = fanned.members
      if (
        Math.abs(scale - fanned.scale) > fanned.scale * 0.02 ||
        !members.every((member) => standing.some((one) => one.marker === member))
      ) {
        fanned = undefined
      }
    }
    const fan = new Set(fanned?.members)
    const taken = new Set<Marker>(fan)
    clusters = new Map()
    const placing: { at: { x: number; y: number }; marker: Marker; reach: number | undefined }[] =
      []
    /* **Fanned places stand round their spot**, each a leg's length out and
       the leg drawn back to it, visible and walked like any other marker. */
    if (fanned) {
      const center = project(fanned.place)
      const offsets = fanOut(fanned.members.length, reach)
      fanned.members.forEach((member, at) => {
        const offset = offsets[at] as { x: number; y: number }
        if (member.gatheredBy !== undefined) {
          member.gatheredBy = undefined
        }
        if ((member.gathered?.length ?? 0) > 0) {
          member.gathered = []
        }
        if (member.fanned !== true) {
          member.fanned = true
        }
        member.style.setProperty('--_map-marker-leg', `${Math.hypot(offset.x, offset.y)}px`)
        member.style.setProperty(
          '--_map-marker-leg-angle',
          `${Math.atan2(-offset.y, -offset.x)}rad`,
        )
        placing.push({
          at: { x: center.x + offset.x, y: center.y + offset.y },
          marker: member,
          reach: standing.find((one) => one.marker === member)?.reach,
        })
      })
    }
    for (const marker of markers()) {
      if (!fan.has(marker) && marker.fanned === true) {
        marker.fanned = false
        marker.style.removeProperty('--_map-marker-leg')
        marker.style.removeProperty('--_map-marker-leg-angle')
      }
    }
    for (const one of standing) {
      if (taken.has(one.marker)) {
        continue
      }
      const group = gathering
        ? standing.filter(
            (other) =>
              !taken.has(other.marker) &&
              Math.hypot(other.at.x - one.at.x, other.at.y - one.at.y) <= reach,
          )
        : [one]
      for (const member of group) {
        taken.add(member.marker)
      }
      const [lead, ...rest] = group.map((member) => member.marker) as [Marker, ...Marker[]]
      const names = rest.length > 0 ? [lead, ...rest].map((one) => one.label || one.name || '') : []
      if (!sameNames(lead.gathered, names)) {
        lead.gathered = names
      }
      if (lead.gatheredBy !== undefined) {
        lead.gatheredBy = undefined
      }
      for (const member of rest) {
        if (member.gatheredBy !== lead) {
          member.gatheredBy = lead
        }
        if ((member.gathered?.length ?? 0) > 0) {
          member.gathered = []
        }
      }
      if (rest.length > 0) {
        clusters.set(lead, [lead, ...rest])
      }
      placing.push({
        at: {
          x: group.reduce((sum, member) => sum + member.at.x, 0) / group.length,
          y: group.reduce((sum, member) => sum + member.at.y, 0) / group.length,
        },
        marker: lead,
        reach: one.reach,
      })
    }
    for (const { at, marker, reach } of placing) {
      marker.style.setProperty('--_map-marker-x', `${at.x}px`)
      marker.style.setProperty('--_map-marker-y', `${at.y}px`)
      /* **The name goes where there is room for it.** It sits after the
         point in reading order, and a place near that edge of the view had
         its name cut off by it: shown on focus, which is exactly when a reader
         walking the markers needs to read it. Turned to the other side only
         where the name does not fit and the other side has more room, so a
         marker in the open keeps its place in the reading order. */
      if (reach !== undefined) {
        const ahead = rtl ? at.x : width - at.x
        const behind = rtl ? width - at.x : at.x
        marker.side = reach <= ahead || ahead >= behind ? 'end' : 'start'
      }
    }
    /* **A position is placed as a marker is, and its ring is measured on the
       map.** The accuracy is meters on the ground, and how many pixels that is
       depends on the zoom and, in Web Mercator, the latitude: so the ring is
       the distance between the position and a point that many meters north of
       it, projected by the renderer, which is right at every zoom and on every
       renderer without knowing which projection it uses. **Its heading is
       against the view**, which a renderer can turn: on a map turned east, a
       walker going north points up and to the left. */
    for (const position of positions()) {
      if (typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        continue
      }
      const at = project({ lat: position.lat, lng: position.lng })
      const meters = position.accuracy ?? 0
      const edge =
        meters > 0
          ? project({ lat: position.lat + meters / METERS_PER_DEGREE, lng: position.lng })
          : at
      position.style.setProperty('--_map-position-x', `${at.x}px`)
      position.style.setProperty('--_map-position-y', `${at.y}px`)
      position.style.setProperty(
        '--_map-position-heading',
        `${(position.heading ?? 0) - bearing}deg`,
      )
      position.style.setProperty(
        '--_map-position-radius',
        `${Math.hypot(edge.x - at.x, edge.y - at.y)}px`,
      )
    }
    /* **The points in view, stood where they are now**: which they are was
       asked of the renderer when it last went still, and a pan in between
       carries them rather than asking again every frame. */
    for (const [layer, found] of seen) {
      const walk = found.map(({ place, ...one }) => ({ ...one, ...project(place) }))
      if (!sameWalk(layer.walk, walk)) {
        layer.walk = walk
      }
    }
  }
  const stopViewing = driver.onView?.(place)
  /* **What is drawn follows what is written, once a task.** A part that
     moves, is renamed or is retoned says so with `helix-map-part-change`,
     and a marker or a position is placed again while a route or an area is
     redrawn: a walker's step is not a reason to settle every route's colors
     and hand the renderer every line again. Several in one task, a walker
     moving and its route's progress with it, are one of each. */
  let live = true
  let placing = false
  let drawing = false
  let queued = false
  const flush = (): void => {
    queued = false
    if (!live) {
      return
    }
    if (placing) {
      placing = false
      place()
    }
    if (drawing) {
      drawing = false
      drawn?.update()
    }
  }
  const soon = (what: { draw?: boolean; place?: boolean }): void => {
    placing ||= what.place === true
    drawing ||= what.draw === true
    if (!queued) {
      queued = true
      queueMicrotask(flush)
    }
  }
  const handlePartChange = (event: Event): void => {
    const { kind } = (event as HelixMapPartChangeEvent).detail
    /* A cluster gathered or let go is the connector's own doing. */
    if (kind !== 'cluster') {
      soon(kind === 'layer' ? { draw: true } : { place: true })
    }
  }
  frame.addEventListener(HelixMapPartChangeEvent.eventName, handlePartChange)
  /* **A route's color is its stylesheet's**, so what restyles one is watched
     on each route and area themselves, and not over the whole frame, where
     the renderer rebuilds its own controls: a class, an inline token, and the
     tone and variant axes for a part whose tier does not hear them. `hidden`
     turns a layer off. */
  const styled = new MutationObserver(() => soon({ draw: true }))
  const watchLayers = (): void => {
    styled.disconnect()
    for (const layer of [...frame.children].filter(isLayer)) {
      styled.observe(layer, {
        attributeFilter: ['class', 'hidden', 'style', 'tone', 'variant'],
        attributes: true,
      })
    }
  }
  watchLayers()
  /* A part added or taken away: the frame's own children, and not the
     renderer's inside the map. */
  const children = new MutationObserver(() => {
    watchLayers()
    soon({ draw: true, place: true })
  })
  children.observe(frame, { childList: true })
  /* **A theme that moves moves the routes**, whose colors are settled once
     and handed to a renderer that cannot read a token: a mode switched or a
     brand painted on anything above the frame draws them again. */
  const stopTheming = drawn ? watchTheme(frame, () => drawn.update()) : undefined
  place()

  /* **A marker the keyboard reaches is a marker in view.** The walk goes in
     the order the page wrote, which is not the order of the screen, so the
     next place is often off the edge; a reader arriving at a place they
     cannot see is a reader told where they are and shown somewhere else. */
  const reveal = (event: FocusEvent): void => {
    const marker = event.composedPath().find(isMarker)
    if (!marker || !driver.project || !driver.show) {
      return
    }
    if (typeof marker.lat !== 'number' || typeof marker.lng !== 'number') {
      return
    }
    const at = driver.project({ lat: marker.lat, lng: marker.lng })
    const { height, width } = viewportOf(frame)
    if (at.x < 0 || at.y < 0 || at.x > width || at.y > height) {
      driver.show({ lat: marker.lat, lng: marker.lng }, motionOf(frame, 'travel'))
    }
  }
  frame.addEventListener('focusin', reveal)

  /* **A cluster pressed is opened by zooming in** to its places, unless the
     page connected to answer it itself. */
  const handleCluster = (event: Event): void => {
    /* A points layer's count, pressed from the keyboard: the renderer's own
       zoom to where it comes apart. */
    const layer = event.target as Layer
    const key = (event as HelixMapClusterEvent).detail.key
    if (isLayer(layer) && layer.layerKind === 'points' && key?.startsWith('c:')) {
      drawn?.expand?.(idOf(layer), Number(key.slice(2)))
      return
    }
    const members = clusters.get(event.target as Marker)
    if (!members || options.clusterZoom === false) {
      return
    }
    const lats = members.map((one) => one.lat as number)
    const lngs = members.map((one) => one.lng as number)
    /* **Places no zoom draws apart fan out where they are**, as does every
       cluster on a renderer that cannot frame a stretch of the world. */
    const middle = {
      lat: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
      lng: lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length,
    }
    const spread = Math.max(
      ...members.map(
        (one) =>
          Math.hypot(
            (one.lat as number) - middle.lat,
            ((one.lng as number) - middle.lng) * Math.cos((middle.lat * Math.PI) / 180),
          ) * METERS_PER_DEGREE,
      ),
    )
    if (spread <= SAME_SPOT || !driver.fit) {
      fanned = { members, place: middle, scale: scaleOf(middle) }
      place()
      return
    }
    driver.fit(
      {
        northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
        southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
      },
      96,
      motionOf(frame, 'travel'),
    )
  }
  frame.addEventListener(HelixMapClusterEvent.eventName, handleCluster)

  /* **A fan closes on Escape**, back to the cluster with the focus on it, and
     on a press anywhere on the map that is not one of its places. */
  const closeFan = (): Marker | undefined => {
    const lead = fanned?.members[0]
    fanned = undefined
    place()
    return lead
  }
  const handleFanKey = (event: KeyboardEvent): void => {
    if (fanned && event.key === 'Escape') {
      event.preventDefault()
      closeFan()?.focus()
    }
  }
  const handleFanPress = (event: MouseEvent): void => {
    if (fanned && !event.composedPath().some(isMarker)) {
      closeFan()
    }
  }
  frame.addEventListener('keydown', handleFanKey)
  frame.addEventListener('click', handleFanPress)

  return {
    disconnect(): void {
      live = false
      drawn?.stop()
      stopViewing?.()
      stopTheming?.()
      styled.disconnect()
      children.disconnect()
      frame.removeEventListener(HelixMapPartChangeEvent.eventName, handlePartChange)
      frame.removeEventListener('focusin', reveal)
      frame.removeEventListener(HelixMapClusterEvent.eventName, handleCluster)
      frame.removeEventListener('keydown', handleFanKey)
      frame.removeEventListener('click', handleFanPress)
      for (const marker of markers()) {
        marker.style.removeProperty('--_map-marker-x')
        marker.style.removeProperty('--_map-marker-y')
        if (marker.gatheredBy !== undefined) {
          marker.gatheredBy = undefined
        }
        if ((marker.gathered?.length ?? 0) > 0) {
          marker.gathered = []
        }
        if (marker.fanned === true) {
          marker.fanned = false
        }
        marker.style.removeProperty('--_map-marker-leg')
        marker.style.removeProperty('--_map-marker-leg-angle')
      }
      for (const layer of seen.keys()) {
        layer.walk = []
      }
      for (const position of positions()) {
        for (const name of ['heading', 'radius', 'x', 'y']) {
          position.style.removeProperty(`--_map-position-${name}`)
        }
      }
      frame.removeEventListener(HelixMapPanEvent.eventName, handlePan)
      frame.removeEventListener(HelixMapZoomEvent.eventName, handleZoom)
      frame.removeEventListener(HelixMapRotateEvent.eventName, handleRotate)
      frame.removeEventListener(HelixMapTiltEvent.eventName, handleTilt)
      stopBearing?.()
      restoreKeyboard?.()
      restoreZoom?.()
      if (focusable) {
        if (tabindex === null) {
          focusable.removeAttribute('tabindex')
        } else {
          focusable.setAttribute('tabindex', tabindex)
        }
      }
      listening?.stop()
      credit?.remove()
    },
    fit(options = {}): void {
      if (!driver.fit) {
        return
      }
      /* The points as written: framing needs where a route goes, not its color. */
      const places: MapPlace[] = [
        ...[...markers(), ...positions()]
          .filter((one) => typeof one.lat === 'number' && typeof one.lng === 'number')
          .map((one) => ({ lat: one.lat as number, lng: one.lng as number })),
        ...[...frame.children]
          .filter(isLayer)
          .flatMap((layer) =>
            layer.layerKind === 'points' ? pointsOf(layer).points : (layer.points ?? []),
          ),
      ]
      if (places.length === 0) {
        return
      }
      const lats = places.map((place) => place.lat)
      const lngs = places.map((place) => place.lng)
      driver.fit(
        {
          northEast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
          southWest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
        },
        options.padding ?? 48,
        options.animate === false ? null : motionOf(frame, 'travel'),
      )
    },
  }
}
