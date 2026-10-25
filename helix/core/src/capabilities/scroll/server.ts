import type { Scroll } from './contract.generated.js'

/** Scrolls nothing and holds nothing still: a server has nothing that scrolls. */
export const serverScroll: Scroll<unknown> = {
  by: () => undefined,
  lock: () => () => undefined,
  observe: () => () => undefined,
  offset: () => ({ x: 0, y: 0 }),
  reveal: () => undefined,
  to: () => undefined,
}
