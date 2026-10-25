import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { setForm } from '@fusion.dev/helix-core/capabilities/form'
import { setGesture } from '@fusion.dev/helix-core/capabilities/gesture'
import { setHaptics } from '@fusion.dev/helix-core/capabilities/haptics'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { setTimers } from '@fusion.dev/helix-core/capabilities/timers'
import { nativeGesture } from '../drivers/gesture'
import { nativeMotion } from '../drivers/motion'
import { nativeAnnounce } from './announce'
import { nativeClipboard } from './clipboard'
import { askReducedMotion, askScreenReader, nativeEnvironment } from './environment'
import { nativeFocus } from './focus'
import { nativeForm } from './form'
import { nativeHaptics } from './haptics'
import { installIntl } from './intl'
import { nativeKeys } from './keys'
import { nativeLocale } from './locale'
import { nativeMeasure } from './measure'
import { nativeOpenLink } from './open-link'
import { nativeScroll } from './scroll'
import { nativeTimers } from './timers'

/**
 * Sets the React Native implementation of each capability through core's
 * setters, installs the pieces of `Intl` the engine lacks, and asks the
 * system once whether it reduces motion. The native
 * adapter's root calls it once, and an app that sets one of its own, such as
 * an open-link through its router, sets it after.
 *
 * **Keys is not set here.** It needs a native module, and lands with it.
 */
export const installNativeCapabilities = (): void => {
  installIntl()
  setAnnounce(nativeAnnounce)
  setClipboard(nativeClipboard)
  setEnvironment(nativeEnvironment)
  setFocus(nativeFocus)
  setForm(nativeForm)
  setGesture(nativeGesture)
  setHaptics(nativeHaptics)
  setKeys(nativeKeys)
  setLocale(nativeLocale)
  setMeasure(nativeMeasure)
  setMotion(nativeMotion)
  setOpenLink(nativeOpenLink)
  setScroll(nativeScroll)
  setTimers(nativeTimers)
  askReducedMotion()
  askScreenReader()
}
