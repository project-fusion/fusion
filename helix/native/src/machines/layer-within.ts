/**
 * The region a layer takes as its own beside its anchor, as the web's
 * Tooltip `within` names the box a chart's bubble belongs to: a touch that
 * starts there is not a press outside the layer, so a chart's reading stays
 * shown while a finger moves it, taps another reading, or turns the view.
 *
 * A view that draws layers in it gives this context its own view; the layer
 * measures that view in the window as it opens and as it moves, as it
 * measures its anchor.
 */

import { createContext, useContext, useEffect, useRef } from 'react'

/** The view whose box a layer drawn inside it takes as its own, or `null`. */
export const LayerWithin = createContext<() => unknown>(() => null)

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measures {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** The box of the region a layer takes as its own, measured as `again` changes while it is open. */
export const useWithin = (open: boolean, again: unknown) => {
  const region = useContext(LayerWithin)
  const box = useRef<[number, number, number, number] | undefined>(undefined)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new place is a moved anchor
  useEffect(() => {
    if (!open) {
      box.current = undefined
      return
    }
    ;(region() as Measures | null)?.measureInWindow?.((x, y, width, height) => {
      box.current = [x, y, width, height]
    })
  }, [region, open, again])
  return box
}
