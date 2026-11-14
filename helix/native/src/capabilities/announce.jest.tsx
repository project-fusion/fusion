import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { AccessibilityInfo } from 'react-native'
import { nativeAnnounce } from './announce'

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeAnnounce', () => {
  test('queues a polite message behind what the screen reader is saying', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
    nativeAnnounce.say('Saved', 'polite')
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith('Saved', { queue: true })
  })

  test('says an assertive message at once, interrupting', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
    nativeAnnounce.say('Moved to place 2 of 4', 'assertive')
    expect(announce).toHaveBeenCalledWith('Moved to place 2 of 4', { queue: false })
  })

  test('says the message with no options where AccessibilityInfo cannot take them', () => {
    /* `replaceProperty` refuses a function, so the method is taken away and
       put back by hand. */
    const withOptions = AccessibilityInfo.announceForAccessibilityWithOptions
    Object.assign(AccessibilityInfo, { announceForAccessibilityWithOptions: undefined })
    try {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility')
      nativeAnnounce.say('Saved', 'polite')
      expect(announce).toHaveBeenCalledTimes(1)
      expect(announce).toHaveBeenCalledWith('Saved')
    } finally {
      Object.assign(AccessibilityInfo, { announceForAccessibilityWithOptions: withOptions })
    }
  })
})
