import type { auditChildren as audit, auditEntry as entry } from './audit-children.js'

/**
 * The unregistered-child warning in a production build: nothing.
 *
 * `#audit-children` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code. The signature is the audit's, so a call site reads the same in both
 * builds. See `audit-children.ts`.
 */
export const auditChildren: typeof audit = () => {}

/** The missing-entry warning in a production build: nothing. See `auditEntry`. */
export const auditEntry: typeof entry = () => {}
