/**
 * A layer placed over its anchor, as a Select's `position="item-aligned"` puts
 * its list: the option it opened on stands where the trigger is, by core's
 * `over`, as the web's does. The element says which option through what a
 * machine bound before the layer asks of it.
 *
 * **Measured from the boxes on screen, once each has drawn.** Where the option
 * stands in the list is read for a short while as the list comes to rest and
 * then kept, so a reader moving through the list does not move it under them.
 * The trigger is read each frame, so a page that scrolls moves the list with
 * it. **Out of sight until placed**, as any anchored layer is.
 */
import { measuredOf } from '@fusion.dev/helix-core/layers'
import { over } from '@fusion.dev/helix-core/listbox'
import { useEffect, useRef, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import type { LayerAt } from '../render/layered'
import { direction } from '../render/styles'
import type { Placed } from './layer-place'
import { MARGIN } from './layering'

/** What an element asks of a layer placed over its anchor. */
export interface OverAsked {
  /** The view of the option that stands on the anchor, once it has drawn. */
  readonly option: () => unknown
}

/** A view measured in the window, as React Native's host instances are. */
interface Measures {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** The frames the list has to come to rest in, about a third of a second. */
const SETTLING = 20

type Box = readonly [number, number, number, number]

/** The box of a view, told to `done`, or nothing where it has none yet. */
const boxOf = (view: unknown, done: (box: Box | undefined) => void): void => {
  const measures = (view as Measures | null | undefined)?.measureInWindow
  if (measures === undefined) {
    done(undefined)
    return
  }
  ;(view as Measures).measureInWindow?.((x, y, width, height) => done([x, y, width, height]))
}

/** What `useOver` reads beside the layer's own place. */
export interface OverAround {
  readonly active: boolean
  readonly anchor: unknown
  readonly asked: { readonly over?: OverAsked } | undefined
  readonly keyboard: number
  readonly origin: { readonly x: number; readonly y: number }
  readonly view: unknown
}

/** Where a list stands over its anchor, in points from the host. */
export interface OverPlace {
  readonly at: LayerAt
  readonly width: number
}

/** The window's lengths and the writing direction, as `over` reads them. */
export interface OverWindow {
  readonly height: number
  readonly rtl: boolean
  readonly width: number
}

/** Places a panel at `boxes` over its trigger, with the option `row` points into it on the trigger. */
export const overAt = (
  trigger: Box,
  panel: Box,
  row: { readonly height: number; readonly top: number },
  frame: OverWindow,
  origin: { readonly x: number; readonly y: number },
): OverPlace => {
  const { left, top } = over({
    margin: MARGIN,
    option: row,
    panel: { height: panel[3], width: panel[2] },
    rtl: frame.rtl,
    trigger: { height: trigger[3], left: trigger[0], top: trigger[1], width: trigger[2] },
    viewport: { height: frame.height, width: frame.width },
  })
  return { at: { left: left - origin.x, top: top - origin.y }, width: trigger[2] }
}

/**
 * The layer's place: `placed` as Floating UI has it, or, where its element
 * asks to stand over its anchor, the place over it, with the room of the whole
 * window, and no side.
 */
export const useOver = (placed: Placed, around: OverAround): Placed => {
  const { active, anchor, keyboard, origin, view } = around
  const asked = around.asked?.over
  const on = active && asked !== undefined
  const window = useWindowDimensions()
  const height = Math.max(0, window.height - keyboard)
  const [place, setPlace] = useState<OverPlace | undefined>(undefined)
  const row = useRef<{ height: number; top: number } | undefined>(undefined)
  const latest = useRef({ asked, height, origin, width: window.width })
  latest.current = { asked, height, origin, width: window.width }
  useEffect(() => {
    if (!on) {
      row.current = undefined
      setPlace(undefined)
      return undefined
    }
    let frame = 0
    let frames = 0
    const measureRow = (panel: Box, done: () => void): void => {
      if (frames >= SETTLING && row.current !== undefined) {
        done()
        return
      }
      boxOf(latest.current.asked?.option(), (box) => {
        if (box !== undefined) {
          row.current = { height: box[3], top: box[1] - panel[1] }
        } else if (frames >= SETTLING) {
          row.current = { height: 0, top: 0 }
        }
        done()
      })
    }
    const look = () => {
      frames += 1
      boxOf(anchor, (trigger) => {
        boxOf(view, (panel) => {
          if (trigger === undefined || panel === undefined || panel[3] === 0) {
            return
          }
          measureRow(panel, () => {
            const placedRow = row.current
            if (placedRow === undefined) {
              return
            }
            const { height: tall, origin: from, width } = latest.current
            const next = overAt(
              trigger,
              panel,
              placedRow,
              { height: tall, rtl: direction() === 'rtl', width },
              from,
            )
            setPlace((now) =>
              now?.at.left === next.at.left &&
              now?.at.top === next.at.top &&
              now?.width === next.width
                ? now
                : next,
            )
          })
        })
      })
      frame = requestAnimationFrame(look)
    }
    frame = requestAnimationFrame(look)
    return () => cancelAnimationFrame(frame)
  }, [anchor, on, view])
  if (!on) {
    return placed
  }
  const { aligned: _aligned, arrow: _arrow, side: _side, ...rest } = placed
  if (place === undefined) {
    const { at: _at, ...hidden } = rest
    return hidden
  }
  return {
    ...rest,
    at: place.at,
    measured: measuredOf(
      { height: Math.max(0, height - MARGIN * 2), width: Math.max(0, window.width - MARGIN * 2) },
      place.width,
    ),
  }
}
