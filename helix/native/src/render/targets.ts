/**
 * The views a page registers by id, which a layer whose `target` holds that
 * id is placed against, as a tour stop is placed against the control it
 * explains. **A phone has no document to find an element in by its id**, so
 * the view registers itself with `useTarget`, as a section does with
 * `useSection`.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react'

/** One registered view, and when it registered, which the latest wins by. */
interface Registered {
  readonly node: unknown
  readonly order: number
}

const registered = new Map<string, Registered>()
const heard = new Set<() => void>()
let drawn = 0

const tell = () => {
  for (const changed of [...heard]) {
    changed()
  }
}

/** Hears each view that registers or leaves. */
export const observeTargets = (changed: () => void): (() => void) => {
  heard.add(changed)
  return () => {
    heard.delete(changed)
  }
}

/** The view registered under `id` now, or `null`. */
export const targetNow = (id: string): unknown => registered.get(id)?.node ?? null

/** The view registered under `id`, kept current as views register and leave. */
export const useTargetView = (id: string | undefined): unknown =>
  useSyncExternalStore(observeTargets, () => (id === undefined ? null : targetNow(id)))

/**
 * Registers a view under `id` for a layer to be placed against: pass what it
 * returns as the view's `ref`.
 *
 * ```tsx
 * const save = useTarget('save')
 * <Pressable ref={save}>…</Pressable>
 * <HelixTourStop for="save">…</HelixTourStop>
 * ```
 *
 * A view registered later under the same id stands in for the one before
 * while both are drawn. No id, or an empty one, registers nothing. **A Helix
 * element given an `id` registers its own view under it**, so a page's code
 * shared with the web names a target as the web does.
 */
export const useTarget = (id: string | undefined): ((node: unknown) => void) => {
  const order = useRef(0)
  return useCallback(
    (node: unknown) => {
      if (id === undefined || id === '') {
        return
      }
      if (node === null) {
        if (registered.get(id)?.order === order.current) {
          registered.delete(id)
          tell()
        }
        return
      }
      if (order.current === 0) {
        drawn += 1
        order.current = drawn
      }
      registered.set(id, { node, order: order.current })
      tell()
    },
    [id],
  )
}
