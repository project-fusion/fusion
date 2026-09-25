import {
  HelixMapPanEvent,
  HelixMapZoomEvent,
  isRtl,
  type ViewportPanDetail,
  type ViewportZoomDetail,
} from '@fusion.dev/helix-core'
import { creditParts } from '../credit/credit.js'

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
  /** Moves the view by this many CSS pixels, right and down positive. */
  panBy(x: number, y: number, animate: boolean): void
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
  /** Zooms one step in, `1`, or out, `-1`, by whatever a step is to this renderer. */
  zoomBy(direction: 1 | -1, animate: boolean): void
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
}

/** Where the connector writes the renderer's credit, so it can find its own. */
const CREDIT = 'data-helix-map-credit'

/** Whether the reader asked for less motion, read when it is needed. */
const still = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

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
 * the frame draws its own; and the renderer's credit written into the frame's
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
    driver.panBy(inline * width * by, block * height * by, !still())
  }
  const handleZoom = (event: Event): void => {
    const { by } = (event as CustomEvent<ViewportZoomDetail>).detail
    if (by !== 0) {
      driver.zoomBy(by > 0 ? 1 : -1, !still())
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

  return {
    disconnect(): void {
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
  }
}
