import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import type { Family } from '../style/form'
import { boundTo } from './props'
import type { Turned } from './toggle'

/*
 * The state an element is in while an element drawn inside it stands open,
 * as a navigation is `open` while a megamenu among its destinations is. The
 * web element hears each `toggle` sent inside it; a phone has no event that
 * travels up, so each element drawn inside says whether it stands open,
 * through a context the element around provides.
 */

/** Tells the element around whether the element it knows by `key` stands open. */
type Report = (key: object, open: boolean) => void

const Disclosed = createContext<Report | undefined>(undefined)

/* What a layer holds is inside the element that opens it, as a menu's rows
   are inside its menu on the web. */
carryIntoLayers(Disclosed)

/**
 * Hosts `disclosed` on an element, as the expansion binds it: the state it
 * is in while any element drawn inside it stands open.
 */
export const useDisclosed = (_family: Family, _props: Props, use: MachineUse): Behavior => {
  const state = boundTo(use, 'state', 'state') ?? 'open'
  const [open, setOpen] = useState<ReadonlySet<object>>(() => new Set())
  const report = useCallback<Report>((key, opened) => {
    setOpen((now) => {
      if (now.has(key) === opened) {
        return now
      }
      const next = new Set(now)
      if (opened) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])
  return {
    marks: [],
    parts: { host: { states: { [state]: open.size > 0 } } },
    provide: (drawn) => <Disclosed.Provider value={report}>{drawn}</Disclosed.Provider>,
  }
}

/**
 * Whether an element stands open: its host is in its `open` state, as a
 * layer's element is while the layer stands open, or its toggle opens and
 * stands open, as an accordion section does.
 */
export const standsOpen = (family: Family, behavior: Behavior, turned?: Turned): boolean =>
  behavior.parts.host?.states?.open === true ||
  (family.api?.toggle?.opens !== undefined && turned?.checked === true)

/**
 * Tells the element around that names a `disclosed` state whether this
 * element stands open, and that it no longer does once it is taken away.
 */
export const useReportOpen = (open: boolean): void => {
  const report = useContext(Disclosed)
  const key = useRef({}).current
  useLayoutEffect(() => {
    report?.(key, open)
  }, [key, open, report])
  useLayoutEffect(() => () => report?.(key, false), [key, report])
}
