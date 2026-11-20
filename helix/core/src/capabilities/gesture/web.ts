import { capturePointer } from '../../utils/capture-pointer/capture-pointer.js'
import type { Dragged, DragSetup, Point } from '../types.generated.js'
import type { Gesture } from './contract.generated.js'
import { type DragTrack, trackDrag } from './drag.js'

/** The pointer events a drag listens for on the part. */
const TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const

/** Where a pointer event is, in the viewport's coordinates, as a box from the measure capability is. */
const pointOf = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY })

/**
 * Starts a drag with the main button, a touch, or a pen, where none is down.
 *
 * **The part takes the pointer**, with core's `capturePointer`, so the moves
 * and the release keep arriving once the pointer leaves it. A platform that
 * refuses leaves the drag running on the events that still reach the part.
 * The default is prevented, so the browser does not select the text the drag
 * crosses, as core's other drags do.
 */
const press = (node: HTMLElement, drag: DragTrack, event: PointerEvent): void => {
  if (event.button !== 0 || drag.pointer() !== null) {
    return
  }
  capturePointer(node, event.pointerId)
  event.preventDefault()
  drag.down(event.pointerId, pointOf(event))
}

/** Hands one pointer event to the drag. */
const listenerOf =
  (node: HTMLElement, drag: DragTrack) =>
  (event: PointerEvent): void => {
    switch (event.type) {
      case 'pointerdown':
        press(node, drag, event)
        return
      case 'pointermove':
        drag.move(event.pointerId, pointOf(event))
        return
      case 'pointerup':
        drag.up(event.pointerId, pointOf(event))
        return
      default:
        drag.cancel(event.pointerId)
    }
  }

/** The drag that hears a part, and the listener that hands it the part's pointer events. */
interface Drag {
  /** The `drag` call that heard the part last, whose stop is the one that ends the drag. */
  by: object
  readonly listener: (event: PointerEvent) => void
  readonly track: DragTrack
}

/** The drag that hears each part, until stopped. */
const drags = new WeakMap<HTMLElement, Drag>()

/** Starts a drag of `node` for the `drag` call `by`, listening for the part's pointer events. */
const begin = (
  node: HTMLElement,
  setup: DragSetup,
  heard: (moved: Dragged) => void,
  by: object,
): Drag => {
  const track = trackDrag(setup, heard)
  const listener = listenerOf(node, track)
  for (const type of TYPES) {
    node.addEventListener(type, listener)
  }
  return { by, listener, track }
}

/**
 * Hears a drag through the pointer events on the part: `down` on
 * `pointerdown`, `lift` once the pointer travels past the slop, a `pass` for
 * each stop it crosses along the axis, `drop` on `pointerup`, and `cancel` on
 * `pointercancel` or a stop. Positions are the events' `clientX` and
 * `clientY`.
 *
 * **It tells the moments, and the host moves the part.** The web has no thread
 * of its own for the part to follow the pointer on, so the host draws it
 * there, as core's reorder draws its preview.
 *
 * **A part hears one drag at a time**, as in the native driver. A later
 * `drag` of the same part replaces the setup and the `heard` of the one
 * before. A pointer down carries on into it, keeps the part's capture, and
 * passes the later stops from where it is. The stop of a drag that was
 * replaced does nothing.
 *
 * A stop during a drag tells `cancel` and gives the pointer back.
 */
export const webGesture: Gesture<HTMLElement> = {
  drag: (node, setup, heard) => {
    const by = {}
    const was = drags.get(node)
    if (was) {
      was.by = by
      was.track.hear(setup, heard)
    }
    const drag = was ?? begin(node, setup, heard, by)
    drags.set(node, drag)
    return () => {
      if (drags.get(node) !== drag || drag.by !== by) {
        return
      }
      drags.delete(node)
      for (const type of TYPES) {
        node.removeEventListener(type, drag.listener)
      }
      const pointer = drag.track.pointer()
      if (pointer !== null && node.hasPointerCapture(pointer)) {
        node.releasePointerCapture(pointer)
      }
      drag.track.stop()
    }
  },
}
