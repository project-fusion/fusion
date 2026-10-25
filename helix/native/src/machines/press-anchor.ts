/**
 * What a press drawn in a layer's anchor does for the layer beside its own
 * press: it claims its long press for the layer, opens a tooltip as keyboard
 * focus lands on it, and hands the layer the arrow keys that open it, as
 * `layer-anchor.ts` gives them.
 */
import { useEffect } from 'react'
import type { AnchorPress } from '../render/anchored'
import { claimLongPress } from './long-press'

/**
 * Hosts what a press does for the layer whose anchor it is drawn in, as
 * `anchored` gives it at each render, on the view `shown` holds, whose ring
 * shows while `ringed` holds.
 *
 * **Keyboard focus shows a tooltip around**, as the web's tooltip shows on
 * `:focus-visible`, and focus leaving takes it down. **A layer that opens on
 * a long press claims the press's long press**, as its own where the layer
 * `holds`, as a speed dial does, and as a hint otherwise, as a tooltip does,
 * which the press's own long press outranks. **The press tells the layer its
 * view**, which focus goes back to as the layer closes.
 */
export const useAnchorHooks = (
  anchored: { readonly current: AnchorPress | undefined },
  shown: { readonly current: unknown },
  ringed: boolean,
): void => {
  const anchor = anchored.current
  const node = shown.current
  /* The press's view, which focus goes back to as the layer closes. */
  const seen = anchor?.seen
  useEffect(() => {
    if (seen === undefined || node === null) {
      return undefined
    }
    seen(node)
    return () => seen(null)
  }, [node, seen])
  const shows = anchor?.focused !== undefined
  useEffect(() => {
    if (shows) {
      anchored.current?.focused?.(ringed)
    }
  }, [anchored, ringed, shows])
  const holds = anchor?.hold === undefined ? undefined : (anchor.rank ?? 'hint')
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new view is claimed again as it is drawn
  useEffect(() => {
    if (holds === undefined) {
      return undefined
    }
    return claimLongPress(shown.current, holds, () => anchored.current?.hold?.())
  }, [holds, shown.current])
}
