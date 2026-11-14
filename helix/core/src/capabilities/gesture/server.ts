import type { Gesture } from './contract.generated.js'

/** Hears nothing: a server has no pointer to drag a part with. */
export const serverGesture: Gesture<unknown> = {
  drag: () => () => undefined,
}
