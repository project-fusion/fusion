/**
 * The layers of one kind that stand open one at a time, as the megamenus of
 * a bar do: opening one asks the one open to close, and a touch on another's
 * anchor is no touch outside, so the press there opens that one in place of
 * this one, as the web's megamenu hands its panel over.
 *
 * **Kept by kind across the app**, as the web keeps the bar's one open panel
 * in module scope: the megamenus of a bar sit in whatever the app draws them
 * in, so there is no element around to coordinate through.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { Family, Node } from '../style/form'
import { inside } from './layering'
import type { Turned } from './toggle'

/** A box in the window: its left, its top, its width, and its height. */
type Box = readonly [number, number, number, number]

/** One layer of a kind, as the others read it. */
interface Kin {
  /** Its anchor's box in the window, measured as one of its kind opens. */
  box: Box | undefined
  /** Asks its toggle to close, which its `closes` event may refuse. */
  readonly close: () => void
  /** Measures its anchor in the window. */
  readonly measure: () => void
  /** Whether it stands open now. */
  readonly open: () => boolean
}

const kinds = new Map<string, Set<Kin>>()

/** What a layer of a kind gives the others, read as they need it. */
export interface Alone {
  readonly anchor: () => unknown
  readonly open: boolean
  /** Its element's toggle, which closing it turns. */
  readonly toggled: Turned | undefined
}

/** The kind a layer stands open alone among, its element's, where its node says so. */
export const kindOf = (family: Family, node: Node | undefined): string | undefined =>
  node?.attributes?.alone === true ? family.name : undefined

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measures {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/**
 * Counts a layer among its kind while it is drawn, where its node says it
 * stands open `alone`, and answers whether a touch lands on the anchor of
 * one of its kind, which is no touch outside.
 */
export const useAlone = (
  kind: string | undefined,
  { anchor, open, toggled }: Alone,
): ((x: number, y: number) => boolean) => {
  const latest = useRef({ anchor, open, toggled })
  latest.current = { anchor, open, toggled }
  const kin = useRef<Kin | undefined>(undefined)
  kin.current ??= {
    box: undefined,
    close: () => {
      if (latest.current.open) {
        latest.current.toggled?.turn()
      }
    },
    measure: () => {
      const view = latest.current.anchor() as Measures | null
      view?.measureInWindow?.((x, y, width, height) => {
        if (kin.current !== undefined) {
          kin.current.box = [x, y, width, height]
        }
      })
    },
    open: () => latest.current.open,
  }
  useEffect(() => {
    const own = kin.current
    if (kind === undefined || own === undefined) {
      return undefined
    }
    const set = kinds.get(kind) ?? new Set<Kin>()
    kinds.set(kind, set)
    set.add(own)
    return () => {
      set.delete(own)
    }
  }, [kind])
  /* As it opens, the one open closes, and each anchor of its kind is
     measured, so a touch on one is known as it starts. */
  useEffect(() => {
    if (kind === undefined || !open) {
      return
    }
    for (const other of kinds.get(kind) ?? []) {
      other.measure()
      if (other !== kin.current && other.open()) {
        other.close()
      }
    }
  }, [kind, open])
  return useCallback(
    (x: number, y: number) =>
      kind !== undefined &&
      [...(kinds.get(kind) ?? [])].some(
        (other) => other !== kin.current && inside(other.box, x, y),
      ),
    [kind],
  )
}
