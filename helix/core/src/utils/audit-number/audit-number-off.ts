import type { auditNumber as audit, auditTime as time } from './audit-number.js'

/**
 * The not-a-number warning in a production build: nothing.
 *
 * `#audit-number` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-number.ts`.
 */
export const auditNumber: typeof audit = () => {}

/** The not-a-time warning in a production build: nothing. */
export const auditTime: typeof time = () => {}
