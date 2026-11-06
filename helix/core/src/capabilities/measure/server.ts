import type { Measure } from './contract.generated.js'

/** Has no box and hears no change: a server lays nothing out. */
export const serverMeasure: Measure<unknown> = {
  box: () => null,
  observe: () => () => undefined,
}
