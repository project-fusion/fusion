/**
 * The spec runner, on an entry of its own.
 *
 * **It was in the package barrel, which made two pure functions side-effectful
 * to import.** `index.ts` exported the JSX helpers and this element together,
 * and `@customElement` registers at load, so
 * `import { htmlToJsx } from '@helix-io/sandbox'` for a string transform also
 * defined `helix-sandbox-specs`. In the workbench that import is at module
 * scope, so the definition landed before React hydrated and the element wrote
 * `data-settled` onto itself in the frame before hydration reached it, which is
 * the mismatch `use-sandbox-editor.ts` describes and half of what it did not
 * fix: `/helix/sandbox` still reported one after the editor import moved.
 *
 * A barrel may hold helpers or elements and this one held both, so a consumer
 * could not take the first without the second. The helpers stay in the barrel,
 * because a bundler can drop what it does not use from a module that only
 * declares functions; the element moves here, where importing it is a
 * deliberate act by whoever wants it defined.
 */
export * from '../sandbox/specs/sandbox-specs.js'
