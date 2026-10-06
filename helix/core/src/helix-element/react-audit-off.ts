import type { auditReactProps as audit } from './react-audit.js'

/**
 * The React prop audit in a production build: nothing.
 *
 * `#react-audit` resolves here unless the bundler or runtime asks for the
 * `development` condition, so a production build carries none of the audit's
 * code, its sentences or the list of every event name it checks against. The
 * signature is the audit's, so a call site reads the same in both builds. See
 * `react-audit.ts`.
 */
export const auditReactProps: typeof audit = () => {}
