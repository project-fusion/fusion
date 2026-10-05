/** What `appleTouch` reads of the browser: the parts of `navigator` it needs. */
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
