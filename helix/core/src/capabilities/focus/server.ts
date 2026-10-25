import type { Focus } from './contract.generated.js'

/** Moves nothing and finds nothing: a server has no keyboard focus. */
export const serverFocus: Focus<unknown> = {
  focus: () => undefined,
  focused: () => null,
}
