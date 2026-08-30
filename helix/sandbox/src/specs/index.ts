/**
 * The spec runner, on an entry of its own.
 *
 * **A barrel may hold helpers or elements, and this one held both.**
 * `@customElement` registers at load, so
 * `import { jsxToHtml } from '@fusion.dev/helix-sandbox'` for a string transform
 * would also define `helix-sandbox-specs`. The helpers stay in the barrel,
 * because a bundler can drop what it does not use from a module that only
 * declares functions; the element is here, where importing it is a deliberate
 * act by whoever wants it defined.
 */
export * from '../sandbox/specs/sandbox-specs.js'
