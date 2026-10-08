/**
 * The DOM, registered before any spec file in a process is read.
 *
 * **`split-tests` runs the DOM specs in one process per core, and each process
 * has a first file.** In one process only the first file of 305 ever ran
 * without the DOM a previous file had registered, and 54 of the files depend
 * on it: they import `@fusion.dev/helix-core` at the top, before their own
 * `registerDom()`, so Lit settles on its server shim for `HTMLElement` and
 * happy-dom's parser fails on the elements that shim defines. Measured 8 Oct
 * 2026, every one of the 305 files passes alone with this preloaded, and 54
 * fail alone without it.
 *
 * So a process starts the way 304 of the files started before. Each spec
 * still calls `registerDom()` itself, which is a no-op the second time.
 */
import { registerDom } from '@fusion.dev/helix-testing/dom'

registerDom()
