import type { OpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { Linking } from 'react-native'

/**
 * Follows a destination through the system, with `Linking.openURL`.
 *
 * **An app with a router sets its own** through core's `setOpenLink`, after
 * `installNativeCapabilities`, so a path such as `/settings` opens a screen of
 * the app. The system opens only a URL with a scheme some app handles, and
 * rejects the rest, a bare path among them. The rejection is caught, so a
 * destination nothing opens does nothing.
 */
export const nativeOpenLink: OpenLink = {
  open: (destination) => {
    Linking.openURL(destination).catch(() => undefined)
  },
}
