import type { Announce } from '@fusion.dev/helix-core/capabilities/announce'
import { AccessibilityInfo } from 'react-native'

/**
 * Says a message through the platform's announcement, with
 * `announceForAccessibilityWithOptions` where `AccessibilityInfo` has it and
 * `announceForAccessibility` where it does not.
 *
 * **A polite message is queued**, so VoiceOver says it after what it is
 * saying, and an assertive one is not, so it interrupts. Android takes no
 * options and says each message as it arrives.
 */
export const nativeAnnounce: Announce = {
  say: (message, urgency) => {
    /* Checked at each call: an out-of-tree platform's `AccessibilityInfo` can
       lack the method that takes options. */
    if (typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, {
        queue: urgency === 'polite',
      })
      return
    }
    AccessibilityInfo.announceForAccessibility(message)
  },
}
