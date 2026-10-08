import type { auditNesting as audit } from './audit-nesting.js'

/**
 * The unslotted-item warning in a production build: nothing.
 *
 * `#audit-nesting` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-nesting.ts`.
 */
export const auditNesting: typeof audit = () => {}
