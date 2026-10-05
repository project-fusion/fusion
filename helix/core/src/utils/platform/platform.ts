/** What `onApple` and `appleTouch` read of the browser: the parts of `navigator` they need. */
export interface Platform {
  readonly maxTouchPoints?: number
  readonly platform?: string
  readonly userAgent?: string
}

/**
 * Whether the browser is iOS or iPadOS, where VoiceOver reads a
 * `role="spinbutton"` text field as a slider a reader cannot type in. React
 * Aria's NumberField drops the role there for the same reason. An iPad asks
 * for the desktop site and reports itself as a Mac, so a Mac with a touch
 * screen counts too.
 */
export const appleTouch = (platform: Platform | undefined): boolean => {
  if (!platform) {
    return false
  }
  const agent = platform.userAgent ?? ''
  if (/iPhone|iPad|iPod/u.test(agent)) {
    return true
  }
  return platform.platform === 'MacIntel' && (platform.maxTouchPoints ?? 0) > 1
}

/**
 * Whether the keyboard in front of the reader is an Apple one, which labels
 * its modifiers with glyphs and whose platform modifier is Command.
 *
 * From the user agent, as every application asks it; `false` on a server,
 * which has no keyboard to ask. Kbd draws `⌘K` or `Ctrl+K` from it and reads
 * `mod` as the key it names.
 */
export const onApple = (
  platform: Platform | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): boolean => platform !== undefined && /mac|iphone|ipad|ipod/i.test(platform.userAgent ?? '')
