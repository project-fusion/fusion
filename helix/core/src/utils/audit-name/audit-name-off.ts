import type { auditName as audit } from './audit-name.js'

/**
 * The missing-name warning in a production build: nothing.
 *
 * `#audit-name` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-name.ts`.
 */
export const auditName: typeof audit = () => {}
