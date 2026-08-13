'use client'

import '@helix-io/web/app-header'
import '@helix-io/web/button'
import '@helix-io/web/card'
import '@helix-io/web/divider'
import '@helix-io/web/icon'

/**
 * Registers every Helix element used by the app.
 *
 * A custom element registers as a side effect of importing its module, and that
 * import has to be in the client graph to ever run. A server component's
 * imports do not ship to the browser, so this is a client component and it is
 * the only one: rendering `<helix-card>` in JSX needs no client boundary of its
 * own, because an unregistered tag is just an unknown element in the HTML that
 * upgrades the moment the definition lands.
 *
 * That keeps pages as server components, which is the point of the App Router.
 *
 * Renders nothing. It exists for its imports.
 */
export function HelixElements(): null {
  return null
}
