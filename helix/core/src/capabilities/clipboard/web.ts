import { deepActiveElement } from '../../utils/focusable-elements/focusable-elements.js'
import type { Clipboard } from './contract.generated.js'
import { clipboard, setClipboard } from './index.js'
import { serverClipboard } from './server.js'

/**
 * The write `execCommand` makes from a textarea made for the moment, where
 * the async clipboard is refused.
 *
 * Deprecated and still the more widely permitted of the two routes: it is
 * synchronous and rides the user gesture that called it, so it works in a
 * sandboxed frame where the async clipboard is refused. A textarea and not
 * the selection, because the text being copied is not on the page.
 *
 * `fixed` and `opacity: 0` and not off-screen, because scrolling to a focused
 * element is what a negative offset causes, and a copy that jumps the page is
 * worse than one that does not happen.
 */
const viaCommand = (text: string): boolean => {
  /* Focus goes back where it was. The carrier takes it to be copied from and
     then leaves the page, which dropped a keyboard reader on the body and kept
     a screen reader from hearing the button's name change to "Copied". */
  const had = deepActiveElement()
  const carrier = document.createElement('textarea')
  carrier.value = text
  carrier.setAttribute('readonly', '')
  carrier.setAttribute('aria-hidden', 'true')
  carrier.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.append(carrier)
  /* Focused as well as selected. `select()` focuses in a browser and does not
     everywhere, and `execCommand('copy')` copies the *document's* selection, so
     an unfocused textarea copies whatever was selected on the page instead. */
  carrier.focus()
  carrier.select()
  let wrote = false
  try {
    wrote = document.execCommand('copy')
  } catch {
    wrote = false
  }
  carrier.remove()
  if (had instanceof HTMLElement || had instanceof SVGElement) {
    had.focus({ preventScroll: true })
  }
  return wrote
}

/**
 * Writes to the clipboard by whichever of two routes the page allows.
 *
 * **The async clipboard first**, because it is the one with a future and the
 * only one that reports failure. It is refused in more places than it looks:
 * an insecure origin, a document that is not focused, and a Permissions
 * Policy that defaults to `self`, which a sandboxed iframe without
 * `allow-same-origin` is not. **`execCommand('copy')` second**, from a
 * textarea made for the moment. Where neither is allowed, the write gives
 * `false`.
 */
export const webClipboard: Clipboard = {
  write: async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* Fall through. There is nothing to report yet. */
    }
    return viaCommand(text)
  },
}

/**
 * Sets the browser's clipboard as the capability where nothing has set one
 * yet, and leaves a fake or an app's own in place.
 *
 * **A web controller calls it as it copies**, as `CopyController` does, so a
 * conformance scenario that sets a fake clipboard first copies into it. Off a
 * page, the server's stays.
 */
export const installWebClipboard = (): void => {
  if (clipboard() === serverClipboard && typeof document !== 'undefined') {
    setClipboard(webClipboard)
  }
}
