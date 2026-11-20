/**
 * How an outline keeps the link of the section being read in view, under
 * `follow`, as the web keeps it in a rail that scrolls on its own.
 */
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { HostInstance } from 'react-native'
import { scrollViewAbove } from '../capabilities/scroll'
import type { Entry } from '../render/entry'

/** Whether `outer` is `inner` or holds it. */
const holds = (outer: HostInstance, inner: HostInstance): boolean => {
  let up: HostInstance | null = inner
  while (up) {
    if (up === outer) {
      return true
    }
    up = up.parentElement as HostInstance | null
  }
  return false
}

/**
 * Scrolls the scroll view `link` is drawn in to show it. **Only where that
 * view is the links' own**: the one the sections scroll in, or one holding
 * it, would move the reading under the reader, which is the scroll that
 * marked the link.
 */
export const reveal = (link: HostInstance, section: HostInstance | undefined): void => {
  const view = scrollViewAbove(link)
  if (view === null || (section !== undefined && holds(view, section))) {
    return
  }
  scroll().reveal(link)
}

/** The links an outline draws: the view each copy takes, and the view drawn for a section's id. */
export interface Followed {
  readonly copy: (item: Entry) => Readonly<Record<string, unknown>>
  readonly link: (id: string) => HostInstance | undefined
}

/**
 * The view each copy of an outline's link takes, a ref of its own by the
 * copy's `id`, which the mark is placed against, and the reveal of the link
 * of `current` as it changes, where `follow` holds. `section` is a
 * section's view, which the reveal keeps still.
 */
export const useFollow = (
  follow: boolean,
  current: string,
  section: HostInstance | undefined,
): Followed => {
  const views = useRef(new Map<string, HostInstance>())
  const refs = useRef(new Map<string, (node: HostInstance | null) => void>())
  useEffect(() => {
    const link = views.current.get(current)
    if (follow && link !== undefined) {
      reveal(link, section)
    }
  }, [current, follow, section])
  const link = useCallback((id: string) => views.current.get(id), [])
  /* One ref for each id across renders, so React keeps it attached. */
  const copy = useCallback((item: Entry) => {
    const id = String(item.fields.id ?? item.index)
    let ref = refs.current.get(id)
    if (ref === undefined) {
      ref = (node: HostInstance | null) => {
        if (node === null) {
          views.current.delete(id)
        } else {
          views.current.set(id, node)
        }
      }
      refs.current.set(id, ref)
    }
    return { ref }
  }, [])
  return useMemo(() => ({ copy, link }), [copy, link])
}
