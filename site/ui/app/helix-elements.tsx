'use client'

import '@helix-io/web'
import '@helix-io/sandbox'

/**
 * Registers every Helix element the site uses.
 *
 * A custom element registers as a side effect of importing its module, and a
 * server component's imports never reach the browser. This is the only client
 * component on the site: pages stay server components, because an unregistered
 * tag is an unknown element in the HTML that upgrades when the definition
 * lands.
 */
export function HelixElements(): null {
  return null
}
