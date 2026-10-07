import type { auditServed as audit } from './audit-served.js'

/**
 * The served-rows check in a production build: nothing.
 *
 * `#audit-served` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the check's
 * code. The signature is the check's, so a call site reads the same in both
 * builds. See `audit-served.ts`.
 */
export const auditServed: typeof audit = () => {}
