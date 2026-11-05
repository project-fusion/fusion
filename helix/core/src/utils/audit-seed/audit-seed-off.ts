import type { auditSeed as audit } from './audit-seed.js'

/**
 * The primary contrast check in a production build: nothing.
 *
 * `#audit-seed` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the check's
 * code. The signature is the check's, so a call site reads the same in both
 * builds. See `audit-seed.ts`.
 */
export const auditSeed: typeof audit = () => {}
