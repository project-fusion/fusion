import type { auditDescription as audit } from './audit-description.js'

/**
 * The static-description warning in a production build: nothing.
 *
 * `#audit-description` resolves here unless the bundler or runtime asks for
 * the `development` condition, so a production build carries none of the
 * audit's code. The signature is the audit's, so a call site reads the same in
 * both builds. See `audit-description.ts`.
 */
export const auditDescription: typeof audit = () => {}
