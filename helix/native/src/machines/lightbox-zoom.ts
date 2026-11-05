/**
 * A phone's lightbox zoom: the pan and pinch driver over the viewport, the
 * scale its controls and its state read, the keys that zoom and move about
 * the item, and the new scale said once a reader stops, as the web's
 * `ZoomController` and the element around it say it.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { percentOf, type Zoom } from '@fusion.dev/helix-core/zoom'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { useZoom, type Zooming } from '../drivers/zoom'

/** How long a pinch, a drag, or a double tap stays quiet before its scale is said, as the web waits. */
const QUIET = 400

/** By how much a key or a zoom control zooms in, and out again: half again. */
const STEP = 1.5

/** What the zoom reads of the viewer. */
export interface LightboxZoomSetup {
  readonly lang: string
  readonly max: number
  readonly open: boolean
  /** The words the scale is said in, `zoom-status-label`. */
  readonly said: string
  /** The item shown, whose change puts the zoom back. */
  readonly shown: string | undefined
  /** Told a one-finger drag across the item at its own size, as the swipe it is. */
  readonly swiped: (dx: number, vx: number, width: number) => void
  /** Told any touch, as the chrome comes back. */
  readonly touched: () => void
}

/** What the viewer draws the zoom with. */
export interface LightboxZooming {
  readonly driver: Zooming
  /** Measures the viewport, for the driver and for the swipe's quarter of its width. */
  readonly measure: (event: LayoutChangeEvent) => void
  /** The scale the controls and the state read. */
  readonly scale: number
  /** Zooms in or out by one step, or back, as `+`, `-`, `0` and the controls do. Gives whether it was one. */
  readonly key: (key: string) => boolean
  /** Moves a zoomed item by an arrow key, a tenth of the viewport and 40 points at least. */
  readonly pan: (key: string) => boolean
  readonly zoomIn: () => void
  readonly zoomOut: () => void
}

/** The keys that move about a zoomed item, as the item moves the other way. */
const PANS: Readonly<Record<string, (across: number, down: number) => { x: number; y: number }>> = {
  ArrowDown: (_, down) => ({ x: 0, y: -down }),
  ArrowLeft: (across) => ({ x: across, y: 0 }),
  ArrowRight: (across) => ({ x: -across, y: 0 }),
  ArrowUp: (_, down) => ({ x: 0, y: down }),
}

/** Says a scale once `wait` has passed, and cancels the one pending. */
const useSaying = (setup: LightboxZoomSetup) => {
  const pending = useRef<Stop | undefined>(undefined)
  const latest = useRef(setup)
  latest.current = setup
  useEffect(() => () => pending.current?.(), [])
  return useCallback((scale: number, wait: number) => {
    pending.current?.()
    pending.current = undefined
    const { lang, open, said } = latest.current
    if (!open || said === '') {
      return
    }
    pending.current = timers().timeout(wait, () => {
      pending.current = undefined
      announce().say(formatMessage(said, { percent: percentOf(scale), scale }, lang), 'polite')
    })
  }, [])
}

/** Hosts a phone's lightbox zoom. */
export const useLightboxZoom = (setup: LightboxZoomSetup): LightboxZooming => {
  const [scale, setScale] = useState(1)
  const say = useSaying(setup)
  const width = useRef({ height: 0, width: 0 })
  const quiet = useRef(false)
  const stepping = useRef(false)
  const latest = useRef(setup)
  latest.current = setup
  const changed = useCallback(
    (zoom: Zoom) => {
      setScale(zoom.scale)
      if (!quiet.current) {
        say(zoom.scale, stepping.current ? 0 : QUIET)
      }
    },
    [say],
  )
  const driver = useZoom({
    changed,
    enabled: setup.open,
    max: setup.open ? setup.max : 1,
    swiped: (dx, _dy, vx) => latest.current.swiped(dx, vx, width.current.width),
    tapped: () => latest.current.touched(),
    touched: () => latest.current.touched(),
  })
  /* Every item starts at its own size, and a closed viewer keeps no zoom. */
  const { reset } = driver
  useEffect(() => {
    if (setup.shown !== undefined || !setup.open) {
      quiet.current = true
      reset()
      quiet.current = false
      setScale(1)
    }
  }, [reset, setup.open, setup.shown])
  const step = useCallback((change: () => void) => {
    stepping.current = true
    try {
      change()
    } finally {
      stepping.current = false
    }
  }, [])
  const zoomIn = useCallback(
    () => step(() => driver.zoomTo(driver.zoom().scale * STEP)),
    [driver, step],
  )
  const zoomOut = useCallback(
    () => step(() => driver.zoomTo(driver.zoom().scale / STEP)),
    [driver, step],
  )
  const key = useCallback(
    (pressed: string): boolean => {
      if (latest.current.max <= 1) {
        return false
      }
      if (pressed === '+' || pressed === '=') {
        zoomIn()
      } else if (pressed === '-') {
        zoomOut()
      } else if (pressed === '0') {
        step(() => driver.reset())
      } else {
        return false
      }
      return true
    },
    [driver, step, zoomIn, zoomOut],
  )
  const pan = useCallback(
    (pressed: string): boolean => {
      const by = PANS[pressed]
      if (by === undefined || driver.zoom().scale <= 1) {
        return false
      }
      const box = width.current
      driver.panBy(by(Math.max(40, box.width / 10), Math.max(40, box.height / 10)))
      return true
    },
    [driver],
  )
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width: across } = event.nativeEvent.layout
      width.current = { height, width: across }
      driver.measure(event)
    },
    [driver],
  )
  return { driver, key, measure, pan, scale, zoomIn, zoomOut }
}
