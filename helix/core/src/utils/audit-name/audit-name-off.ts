import type {
  auditName as audit,
  auditField as field,
  auditIconControl as iconControl,
} from './audit-name.js'

/**
 * The missing-name warning in a production build: nothing.
 *
 * `#audit-name` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-name.ts`.
 */
export const auditName: typeof audit = () => {}

/** The field's missing-name warning in a production build: nothing. */
export const auditField: typeof field = () => {}

/** The warning about a control named by a decorative icon, in a production build: nothing. */
export const auditIconControl: typeof iconControl = () => {}
