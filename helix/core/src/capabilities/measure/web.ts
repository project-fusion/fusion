import type { Rect } from '../types.generated.js'
import type { Measure } from './contract.generated.js'

/** One node's `ResizeObserver` and the observers it calls. */
interface Watch {
  readonly heard: Set<(box: Rect) => void>
  readonly observer: ResizeObserver
}

/** The watch on each node, made by its first observer and dropped after its last stops. */
const watches = new WeakMap<Element, Watch>()

const rect = (node: Element): Rect => {
  const { height, width, x, y } = node.getBoundingClientRect()
  return { height, width, x, y }
}

const box = (node: Element): Rect | null => (node.isConnected ? rect(node) : null)

const watch = (node: Element): Watch => {
  const heard = new Set<(box: Rect) => void>()
  const observer = new ResizeObserver(() => {
    const now = box(node)
    if (now) {
      for (const one of [...heard]) {
        one(now)
      }
    }
  })
  observer.observe(node)
  const made = { heard, observer }
  watches.set(node, made)
  return made
}

/**
 * Reads a box with `getBoundingClientRect`, in the viewport's coordinates, and
 * hears a resize through `ResizeObserver`. A node out of the document has no
 * box, so it reads `null`, and the resize it reports on leaving is not passed
 * on.
 *
 * **One `ResizeObserver` for each node**, however many observe it. The last
 * stop disconnects it.
 */
export const webMeasure: Measure<Element> = {
  box,
  observe: (node, changed) => {
    const on = watches.get(node) ?? watch(node)
    /* Its own function, so the same `changed` observed twice is two observers,
       and each stop takes away only its own. */
    const one = (next: Rect): void => changed(next)
    on.heard.add(one)
    return () => {
      on.heard.delete(one)
      if (on.heard.size === 0 && watches.get(node) === on) {
        on.observer.disconnect()
        watches.delete(node)
      }
    }
  },
}
