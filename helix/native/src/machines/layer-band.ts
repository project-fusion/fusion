/**
 * Where a band stands: under its anchor's bottom edge, across the whole
 * window, as a megamenu's band spans the page under its bar on the web.
 *
 * **A band has one degree of freedom, how far down it starts**, so nothing
 * places it on a side and Floating UI is not asked: its view stands at the
 * window's left edge, as wide as the window, with its top at the anchor's
 * bottom, measured in the window. While it is open the anchor is measured
 * each frame, so a band follows a bar that scrolls. Its rules read the room
 * left under it, less the software keyboard, as
 * `floating-available-block-size`, which a band scrolls within.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import type { Placed, Placer } from './layer-place'

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measured {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** A band is placed by no view of its own. */
const UNHELD = (): void => undefined

/** Places a band under its anchor across the window. */
export const useBanded: Placer = ({ active, keyboard, origin }) => {
  const anchor = useRef<unknown>(null)
  const [bottom, setBottom] = useState<number | undefined>(undefined)
  const window = useWindowDimensions()
  useEffect(() => {
    if (!active) {
      setBottom(undefined)
      return undefined
    }
    let last = Number.NaN
    let frame = 0
    const look = () => {
      ;(anchor.current as Measured | null)?.measureInWindow?.((_x, y, _width, height) => {
        const now = y + height
        if (now !== last) {
          last = now
          setBottom(now)
        }
      })
      frame = requestAnimationFrame(look)
    }
    look()
    return () => cancelAnimationFrame(frame)
  }, [active])
  const { x, y } = origin
  return useMemo<Placed>(() => {
    const reference = (node: unknown) => {
      anchor.current = node
    }
    if (bottom === undefined) {
      return { floating: UNHELD, measured: {}, reference }
    }
    return {
      at: { left: -x, top: bottom - y },
      floating: UNHELD,
      measured: {
        'floating-available-block-size': Math.max(0, window.height - keyboard - bottom),
      },
      reference,
    }
  }, [bottom, keyboard, window.height, x, y])
}
