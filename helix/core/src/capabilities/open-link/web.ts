import { followLink } from '../../utils/follow-link/follow-link.js'
import type { OpenLink } from './contract.generated.js'

/**
 * Follows a destination as a click on a link to it does.
 *
 * **Through `followLink`**, which clicks an anchor made for the moment and
 * removes it after, so the browser follows the destination as it follows any
 * link, and a page that catches link clicks on the way down can cancel it.
 */
export const webOpenLink: OpenLink = {
  open: (destination) => {
    followLink(document, { href: destination })
  },
}
