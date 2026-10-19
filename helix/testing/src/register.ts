/**
 * The DOM, registered as this module is evaluated.
 *
 * **Imported first in a DOM spec, so nothing in the file runs without it.** A
 * module's imports are all evaluated before its own code, so a `registerDom()`
 * call in the file comes after every import: one that loads Lit settles on its
 * server shim for `HTMLElement`, and happy-dom's parser fails on the elements
 * that shim defines. A `describe` body runs as the file is collected, before
 * any `beforeAll`, so one reading `window` there finds none. Imported first,
 * this runs before both. `fusion x spec`'s `registered` holds every DOM spec
 * to it.
 *
 * A file passed only because an earlier file in the same process had
 * registered the DOM, so it failed when it ran alone or first.
 */
import { registerDom } from './dom.js'

registerDom()
