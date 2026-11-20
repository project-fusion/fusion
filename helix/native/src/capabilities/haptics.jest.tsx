import { afterEach, describe, expect, jest, test } from '@jest/globals'
import * as ExpoHaptics from 'expo-haptics'
import { nativeHaptics } from './haptics'

/** Spies on each `expo-haptics` call, resolving as the native module does. */
const spies = () => ({
  impact: jest.spyOn(ExpoHaptics, 'impactAsync').mockResolvedValue(undefined),
  notification: jest.spyOn(ExpoHaptics, 'notificationAsync').mockResolvedValue(undefined),
  selection: jest.spyOn(ExpoHaptics, 'selectionAsync').mockResolvedValue(undefined),
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeHaptics', () => {
  test('plays a lift as a medium impact and a drop as a light one', () => {
    const { impact } = spies()
    nativeHaptics.play('lift')
    nativeHaptics.play('drop')
    expect(impact.mock.calls).toEqual([
      [ExpoHaptics.ImpactFeedbackStyle.Medium],
      [ExpoHaptics.ImpactFeedbackStyle.Light],
    ])
  })

  test('plays a pass and a selection as the selection tick', () => {
    const { impact, notification, selection } = spies()
    nativeHaptics.play('pass')
    nativeHaptics.play('select')
    expect(selection).toHaveBeenCalledTimes(2)
    expect(impact).not.toHaveBeenCalled()
    expect(notification).not.toHaveBeenCalled()
  })

  test('plays a cancel as the warning pattern and a notice as the success pattern', () => {
    const { notification } = spies()
    nativeHaptics.play('cancel')
    nativeHaptics.play('notify')
    expect(notification.mock.calls).toEqual([
      [ExpoHaptics.NotificationFeedbackType.Warning],
      [ExpoHaptics.NotificationFeedbackType.Success],
    ])
  })

  test('catches a call that rejects, as each does where the native module is missing', async () => {
    const rejected = Promise.reject(new Error('The native module ExpoHaptics is missing.'))
    const caught = jest.spyOn(rejected, 'catch')
    jest.spyOn(ExpoHaptics, 'impactAsync').mockReturnValue(rejected)
    nativeHaptics.play('lift')
    expect(caught).toHaveBeenCalledTimes(1)
    await expect(rejected).rejects.toThrow('ExpoHaptics')
  })

  test('plays nothing where the app does not install expo-haptics', () => {
    const missing = jest.fn(() => {
      throw new Error("Cannot find module 'expo-haptics'")
    })
    jest.doMock('expo-haptics', missing)
    try {
      jest.isolateModules(() => {
        const isolated = require('./haptics') as typeof import('./haptics')
        expect(() => isolated.nativeHaptics.play('lift')).not.toThrow()
        expect(() => isolated.nativeHaptics.play('drop')).not.toThrow()
      })
      expect(missing).toHaveBeenCalledTimes(1)
    } finally {
      jest.dontMock('expo-haptics')
    }
  })
})
