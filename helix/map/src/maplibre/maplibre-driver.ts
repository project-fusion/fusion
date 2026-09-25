import type { MapDriver } from '../connect-map/connect-map.js'
import type { MapMotion } from '../motion/motion.js'

/** How MapLibre is told to move: over a time and a curve, or at once. */
interface MapLibreAnimation {
  animate?: boolean
  duration?: number
  easing?: (t: number) => number
}

/**
 * The part of a MapLibre `Map` the driver uses, so this package imports no
 * renderer and a page brings whichever version it has.
 */
export interface MapLibreMap {
  /** The canvas, which MapLibre makes focusable. */
  getCanvas(): HTMLElement
  /** The element the map was made in, which holds its controls. */
  getContainer(): HTMLElement
  /** A source by its id, whose `attribution` is its credit. */
  getSource(id: string): { attribution?: string | undefined } | undefined
  /** The style as it stands, whose sources are the ones to credit. */
  getStyle(): { sources?: Record<string, unknown> | undefined } | undefined
  /** Goes to a place, gliding. */
  easeTo(options: MapLibreAnimation & { center: [number, number]; zoom?: number }): unknown
  /** Goes to a place at once. */
  jumpTo(options: { center: [number, number]; zoom?: number }): unknown
  /** The arrow-key handler MapLibre adds unless told not to. */
  keyboard: { disable(): void; enable(): void; isEnabled(): boolean }
  off(type: 'move' | 'resize' | 'sourcedata' | 'styledata', listener: () => void): unknown
  on(type: 'move' | 'resize' | 'sourcedata' | 'styledata', listener: () => void): unknown
  panBy(offset: [number, number], options?: MapLibreAnimation): unknown
  /** Where a place falls in the map's box, in pixels. */
  project(lngLat: [number, number]): { x: number; y: number }
  zoomIn(options?: MapLibreAnimation): unknown
  zoomOut(options?: MapLibreAnimation): unknown
}

/** The class MapLibre's own credit control draws, by its documented name. */
const CONTROL = '.maplibregl-ctrl-attrib'

/**
 * The page's motion as MapLibre takes it: its own duration and curve rather
 * than MapLibre's, so a map pans the way the page's panels slide.
 */
const animation = (motion: MapMotion | null): MapLibreAnimation =>
  motion ? { duration: motion.duration, easing: motion.easing } : { animate: false }

/**
 * Drives a MapLibre map from the Map frame.
 *
 * **The credit is every source's `attribution`**, read again whenever a style
 * or a source changes, since a vector source learns its credit from its
 * TileJSON after the style has loaded. **MapLibre's own credit control is
 * hidden while connected** rather than removed, because the map was made with
 * it and there is no public way to take it off: making the map with
 * `attributionControl: false` avoids it altogether, and is the better way.
 */
export const mapLibreDriver = (map: MapLibreMap): MapDriver => ({
  credits(changed) {
    const control = map.getContainer().querySelector<HTMLElement>(CONTROL)
    const display = control?.style.display ?? ''
    if (control) {
      control.style.display = 'none'
    }
    map.on('styledata', changed)
    map.on('sourcedata', changed)
    return {
      read: () =>
        Object.keys(map.getStyle()?.sources ?? {})
          .map((id) => map.getSource(id)?.attribution ?? '')
          .filter((one) => one !== ''),
      stop: () => {
        map.off('styledata', changed)
        map.off('sourcedata', changed)
        if (control) {
          control.style.display = display
        }
      },
    }
  },
  focusTarget: () => map.getCanvas(),
  onView: (moved) => {
    map.on('move', moved)
    map.on('resize', moved)
    return () => {
      map.off('move', moved)
      map.off('resize', moved)
    }
  },
  panBy: (x, y, motion) => {
    map.panBy([x, y], animation(motion))
  },
  project: ({ lat, lng }) => {
    const { x, y } = map.project([lng, lat])
    return { x, y }
  },
  show: ({ lat, lng, zoom }, motion) => {
    const options = {
      center: [lng, lat] as [number, number],
      ...(zoom === undefined ? {} : { zoom }),
    }
    if (motion) {
      map.easeTo({ ...options, ...animation(motion) })
    } else {
      map.jumpTo(options)
    }
  },
  silenceKeyboard: () => {
    const was = map.keyboard.isEnabled()
    map.keyboard.disable()
    return () => {
      if (was) {
        map.keyboard.enable()
      }
    }
  },
  zoomBy: (direction, motion) => {
    if (direction > 0) {
      map.zoomIn(animation(motion))
    } else {
      map.zoomOut(animation(motion))
    }
  },
})
