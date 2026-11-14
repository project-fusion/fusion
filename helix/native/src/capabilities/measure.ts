import type { Measure } from '@fusion.dev/helix-core/capabilities/measure'
import type { Rect } from '@fusion.dev/helix-core/capabilities/types'
import type { HostInstance } from 'react-native'

/** A box's size, which is what a change is judged on. */
interface Size {
  readonly height: number
  readonly width: number
}

/** The size each node's `onLayout` last reported. */
const sizes = new WeakMap<HostInstance, Size>()

/** The observers of each node, added by `observe` and taken away by its stop. */
const observers = new WeakMap<HostInstance, Set<(box: Rect) => void>>()

/** The box `node` has, in the viewport's coordinates, or `null` once it is out of the tree. */
const box = (node: HostInstance): Rect | null => {
  if (!node.isConnected) {
    return null
  }
  const { height, width, x, y } = node.getBoundingClientRect()
  return { height, width, x, y }
}

/**
 * Tells the observers of `node` that its layout changed. The adapter's views
 * call it from `onLayout`, with the layout that event reports.
 *
 * **Only a change of size is passed on**, as a resize observer passes it on
 * the web: `onLayout` also fires when a view only moves. Observers hear the
 * box `box` reads, in the viewport's coordinates. The `x` and `y` of `rect`
 * are relative to the view's parent, so only its size is read.
 */
export const layoutChanged = (node: HostInstance, rect: Rect): void => {
  const was = sizes.get(node)
  sizes.set(node, { height: rect.height, width: rect.width })
  if (was && was.height === rect.height && was.width === rect.width) {
    return
  }
  const heard = observers.get(node)
  if (!heard) {
    return
  }
  const now = box(node)
  if (!now) {
    return
  }
  for (const one of [...heard]) {
    one(now)
  }
}

/**
 * Reads a box with the host instance's `getBoundingClientRect`, in the
 * viewport's coordinates, and hears a resize through `layoutChanged`. A node
 * out of the tree has no box, so it reads `null`.
 *
 * **`observe` cannot attach to a node**, because React Native 0.88 keeps its
 * `ResizeObserver` behind the `enableResizeObserverByDefault` flag, which is
 * off by default. A view the adapter does not draw is heard only where its
 * own `onLayout` calls `layoutChanged`.
 */
export const nativeMeasure: Measure<HostInstance> = {
  box,
  observe: (node, changed) => {
    const heard = observers.get(node) ?? new Set()
    observers.set(node, heard)
    /* Its own function, so the same `changed` observed twice is two observers,
       and each stop takes away only its own. */
    const one = (next: Rect): void => changed(next)
    heard.add(one)
    return () => {
      heard.delete(one)
    }
  },
}
