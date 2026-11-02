import { announce, setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { camera, setCamera } from '@fusion.dev/helix-core/capabilities/camera'
import { clipboard, setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { environment, setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { files, setFiles } from '@fusion.dev/helix-core/capabilities/files'
import { focus, setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { form, setForm } from '@fusion.dev/helix-core/capabilities/form'
import { gesture, setGesture } from '@fusion.dev/helix-core/capabilities/gesture'
import { haptics, setHaptics } from '@fusion.dev/helix-core/capabilities/haptics'
import { keys, setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale, setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { motion, setMotion } from '@fusion.dev/helix-core/capabilities/motion'
import { openLink, setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { setShare, share } from '@fusion.dev/helix-core/capabilities/share'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { AccessibilityInfo } from 'react-native'
import { nativeGesture } from '../drivers/gesture'
import { nativeMotion } from '../drivers/motion'
import { nativeAnnounce } from './announce'
import { nativeCamera } from './camera'
import { nativeClipboard } from './clipboard'
import { nativeEnvironment } from './environment'
import { nativeFiles } from './files'
import { nativeFocus } from './focus'
import { nativeForm } from './form'
import { nativeHaptics } from './haptics'
import { installNativeCapabilities } from './install'
import { nativeKeys } from './keys'
import { nativeLocale } from './locale'
import { nativeMeasure } from './measure'
import { nativeOpenLink } from './open-link'
import { nativeScroll } from './scroll'
import { nativeShare } from './share'
import { nativeTimers } from './timers'

/** What each slot held before the spec ran, which is the server's. */
const before = {
  announce: announce(),
  camera: camera(),
  clipboard: clipboard(),
  environment: environment(),
  files: files(),
  focus: focus(),
  form: form(),
  gesture: gesture(),
  haptics: haptics(),
  keys: keys(),
  locale: locale(),
  measure: measure(),
  motion: motion(),
  openLink: openLink(),
  scroll: scroll(),
  share: share(),
  timers: timers(),
}

afterEach(() => {
  setAnnounce(before.announce)
  setCamera(before.camera)
  setClipboard(before.clipboard)
  setEnvironment(before.environment)
  setFiles(before.files)
  setFocus(before.focus)
  setForm(before.form)
  setGesture(before.gesture)
  setHaptics(before.haptics)
  setKeys(before.keys)
  setLocale(before.locale)
  setMeasure(before.measure)
  setMotion(before.motion)
  setOpenLink(before.openLink)
  setScroll(before.scroll)
  setShare(before.share)
  setTimers(before.timers)
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('installNativeCapabilities', () => {
  test('sets the native implementation of each capability', () => {
    installNativeCapabilities()
    expect(announce()).toBe(nativeAnnounce)
    expect(camera()).toBe(nativeCamera)
    expect(clipboard()).toBe(nativeClipboard)
    expect(environment()).toBe(nativeEnvironment)
    expect(files()).toBe(nativeFiles)
    expect(focus()).toBe(nativeFocus)
    expect(form()).toBe(nativeForm)
    expect(gesture()).toBe(nativeGesture)
    expect(haptics()).toBe(nativeHaptics)
    expect(keys()).toBe(nativeKeys)
    expect(locale()).toBe(nativeLocale)
    expect(measure()).toBe(nativeMeasure)
    expect(motion()).toBe(nativeMotion)
    expect(openLink()).toBe(nativeOpenLink)
    expect(scroll()).toBe(nativeScroll)
    expect(share()).toBe(nativeShare)
    expect(timers()).toBe(nativeTimers)
  })

  test('asks once whether the system reduces motion, and listens for a change', () => {
    const asked = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    const listened = jest.spyOn(AccessibilityInfo, 'addEventListener')
    installNativeCapabilities()
    expect(asked).toHaveBeenCalledTimes(1)
    expect(listened).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function))
  })
})
