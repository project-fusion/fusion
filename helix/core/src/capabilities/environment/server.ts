import type { Conditions } from '../types.generated.js'
import type { Environment } from './contract.generated.js'
import { NO_INSETS } from './moved.js'

/**
 * The conditions of a request that states none: a light, left-to-right page
 * at the default text size, on the platform `server`, with no reduced motion
 * and no screen reader, in a window of no size with no safe area to keep
 * clear of.
 */
export const UNSTATED_CONDITIONS: Readonly<Conditions> = {
  colorScheme: 'light',
  direction: 'ltr',
  fontScale: 1,
  insets: NO_INSETS,
  platform: 'server',
  reducedMotion: false,
  screenReader: false,
  window: { height: 0, width: 0 },
}

/**
 * The environment of one request: the conditions it states, over the ones in
 * `UNSTATED_CONDITIONS`. Pass what the request says, such as the color scheme
 * a `Sec-CH-Prefers-Color-Scheme` header sends, so the first render in the
 * browser matches the server's.
 *
 * A request does not change while it renders, so `observe` calls nothing.
 */
export const serverEnvironmentFrom = (stated: Partial<Conditions> = {}): Environment => {
  const conditions: Conditions = { ...UNSTATED_CONDITIONS, ...stated }
  return {
    observe: () => () => undefined,
    read: () => ({ ...conditions }),
  }
}

/** The environment of a request that states nothing. */
export const serverEnvironment: Environment = serverEnvironmentFrom()
