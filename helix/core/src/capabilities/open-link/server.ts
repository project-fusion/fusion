import type { OpenLink } from './contract.generated.js'

/** Follows nothing: a server has no page to leave. */
export const serverOpenLink: OpenLink = {
  open: () => undefined,
}
