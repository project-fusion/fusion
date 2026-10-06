import type { auditSource as audit } from './audit-source.js'

/**
 * The missing-table warning in a production build: nothing.
 *
 * `#audit-source` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-source.ts`.
 */
export const auditSource: typeof audit = () => {}
