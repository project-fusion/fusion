/**
 * What every native spec runs with, under jest-expo.
 *
 * **Reanimated and worklets run as the mocks they publish.** Their real
 * modules reach native code React Native's test setup does not register. The
 * drivers draw through them, so the specs hold a driver to what it tells and
 * where it asks a part to be, and how a part moves on screen is for devices
 * to judge. Gesture Handler's own setup registers its views.
 */
/* **Thirty seconds a spec, where Jest gives five.** A runner with no Jest
   cache transforms React Native for the first spec of each file, which took
   longer than five seconds on CI's two cores while the spec itself takes
   milliseconds. */
jest.setTimeout(30_000)

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))

/* Reanimated's mock imports its real index, whose native initializer sets a
   CSS event handler that the Jest build of its module refuses. Nothing the
   mock does needs the initializer. */
jest.mock('react-native-reanimated/src/initializers', () => ({
  initializeReanimatedModule: () => undefined,
}))

/* Gesture Handler binds a shared value in a pan's config with its
   `addListener`, which the shared values of Reanimated's mock lack, and a
   missing one throws on the next tick. These take listeners and call none:
   a spec reads each value where Gesture Handler's Jest utilities read it. */
jest.mock('react-native-reanimated', () => {
  const published = jest.requireActual('react-native-reanimated/mock')
  const { useState } = jest.requireActual('react')
  const listened = (initial) => {
    let now = initial
    return {
      _isReanimatedSharedValue: true,
      addListener: () => undefined,
      get: () => now,
      removeListener: () => undefined,
      set: (next) => {
        now = next
      },
      get value() {
        return now
      },
      set value(next) {
        now = next
      },
    }
  }
  return { ...published, useSharedValue: (initial) => useState(() => listened(initial))[0] }
})

require('react-native-gesture-handler/jestSetup')

/* **Every spec starts at the default text size.** React Native's Jest setup
   reports a font scale of 2, and the theme scales each rem by it, so a spec
   that drew inside HelixRoot would see every rem length doubled. */
{
  const { Dimensions } = require('react-native')
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
}
