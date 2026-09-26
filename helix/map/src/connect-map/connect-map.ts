import {
  HelixMapPanEvent,
  HelixMapZoomEvent,
  isRtl,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { creditParts } from '../credit/credit.js'
import { type MapMotion, motionOf } from '../motion/motion.js'
import { settledColor } from '../style/map-colors.js'

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
  layers?(read: () => MapLayerSpec[]): { stop(): void; update(): void }
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
   * Turns the renderer's own keyboard handling off, and returns what turns it
   * back to how it was.
   */
  silenceKeyboard?(): () => void
  /** Brings a place to the middle of the view, at its zoom where it has one. */
  show?(place: MapPlace & { zoom?: number | undefined }, motion: MapMotion | null): void
  /** Zooms one step in, `1`, or out, `-1`, by whatever a step is to this renderer. */
  zoomBy(direction: 1 | -1, motion: MapMotion | null): void
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
 * A route or an area as a driver draws it, whatever renderer it drives: its
 * kind, the places it passes through or around, and its color settled to sRGB.
 */
export interface MapLayerSpec {
  /** `#hex`, `rgb()` or `rgba()`, which every renderer takes. */
  color: string
  /** Stable for as long as the element is in the frame, for a renderer that keys its layers. */
  id: string
  kind: 'area' | 'route'
  /** What the frame's list calls it. */
  label: string
  /** In order: along a route, and around an area without repeating the first. */
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
  isMapMarker: true
  lat?: number | undefined
  lng?: number | undefined
  /** Which side of its point the name sits on, in reading order. */
  side?: 'end' | 'start'
}

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
  isMapLayer: true
  label?: string | undefined
  layerKind: 'area' | 'route'
  points?: MapPlace[] | undefined
}

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
   * pace for a trip. Nothing where the frame holds no place or the driver
   * cannot frame.
   */
  fit(options?: { padding?: MapPadding | undefined }): void
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
  const writeCredit = (): void => {
    if (!listening || !credit) {
      return
    }
    const nodes = creditParts(listening.read()).map((part) => {
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
  const positions = (): Position[] => [...frame.children].filter(isPosition)
  /* **A route needs two points and an area three**, and one with fewer is a
     layer still being written rather than a shape to draw: MapLibre refuses a
     one-point line outright. */
  const readLayers = (): MapLayerSpec[] =>
    [...frame.children]
      .filter(isLayer)
      .filter((layer) => (layer.points?.length ?? 0) >= (layer.layerKind === 'area' ? 3 : 2))
      .map((layer) => ({
        color: settledColor(layer),
        id: idOf(layer),
        kind: layer.layerKind,
        label: layer.label ?? '',
        points: (layer.points ?? []).map(({ lat, lng }) => ({ lat, lng })),
      }))
  const drawn = driver.layers?.(readLayers)
  const place = (): void => {
    if (!driver.project) {
      return
    }
    const { width } = viewportOf(frame)
    const rtl = isRtl(frame)
    for (const marker of markers()) {
      if (typeof marker.lat !== 'number' || typeof marker.lng !== 'number') {
        continue
      }
      const at = driver.project({ lat: marker.lat, lng: marker.lng })
      marker.style.setProperty('--_map-marker-x', `${at.x}px`)
      marker.style.setProperty('--_map-marker-y', `${at.y}px`)
      /* **The name goes where there is room for it.** It sits after the
         point in reading order, and a place near that edge of the view had
         its name cut off by it: shown on focus, which is exactly when a reader
         walking the markers needs to read it. Turned to the other side only
         where the name does not fit and the other side has more room, so a
         marker in the open keeps its place in the reading order. */
      if (typeof marker.extent === 'function') {
        const reach = marker.extent()
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
       renderer without knowing which projection it uses. */
    for (const position of positions()) {
      if (typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        continue
      }
      const at = driver.project({ lat: position.lat, lng: position.lng })
      position.style.setProperty('--_map-position-x', `${at.x}px`)
      position.style.setProperty('--_map-position-y', `${at.y}px`)
      position.style.setProperty('--_map-position-heading', `${position.heading ?? 0}deg`)
      const meters = position.accuracy ?? 0
      const edge =
        meters > 0
          ? driver.project({ lat: position.lat + meters / METERS_PER_DEGREE, lng: position.lng })
          : at
      position.style.setProperty(
        '--_map-position-radius',
        `${Math.hypot(edge.x - at.x, edge.y - at.y)}px`,
      )
    }
  }
  const stopViewing = driver.onView?.(place)
  /* A marker added, taken away or moved, which only the attributes say: a
     marker reflects its coordinates for this reason. Two observers, because
     one option set covers both: the frame's own children for markers coming
     and going, and every descendant for a coordinate, which only a marker
     has. `childList` over the whole subtree would hear the renderer rebuild
     its own controls inside the map and place every marker for it. */
  /* **What is drawn follows what is written**: a layer added, taken away or
     moved, or given a new tone, which is its color. */
  const changed = (): void => {
    place()
    drawn?.update()
  }
  const layers = new MutationObserver(changed)
  layers.observe(frame, { childList: true })
  const coordinates = new MutationObserver(changed)
  coordinates.observe(frame, {
    attributeFilter: ['accuracy', 'heading', 'lat', 'lng', 'points', 'tone'],
    attributes: true,
    subtree: true,
  })
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

  return {
    disconnect(): void {
      drawn?.stop()
      stopViewing?.()
      layers.disconnect()
      coordinates.disconnect()
      frame.removeEventListener('focusin', reveal)
      for (const marker of markers()) {
        marker.style.removeProperty('--_map-marker-x')
        marker.style.removeProperty('--_map-marker-y')
      }
      for (const position of positions()) {
        for (const name of ['heading', 'radius', 'x', 'y']) {
          position.style.removeProperty(`--_map-position-${name}`)
        }
      }
      frame.removeEventListener(HelixMapPanEvent.eventName, handlePan)
      frame.removeEventListener(HelixMapZoomEvent.eventName, handleZoom)
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
      const places: MapPlace[] = [
        ...[...markers(), ...positions()]
          .filter((one) => typeof one.lat === 'number' && typeof one.lng === 'number')
          .map((one) => ({ lat: one.lat as number, lng: one.lng as number })),
        ...readLayers().flatMap((layer) => layer.points),
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
        motionOf(frame, 'travel'),
      )
    },
  }
}
