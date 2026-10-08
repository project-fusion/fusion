import {
  arrowLeft,
  arrowRight,
  caretDown,
  caretLeft,
  caretRight,
  caretUp,
  check,
  info,
  magnifyingGlass,
  minus,
  plus,
  warning,
  x,
} from '@fusion.dev/helix-icons'
import { registerIcons } from './registry.js'

/*
 * The glyphs the family's entry registers by name: the ones a control most
 * often needs. The four carets, the two horizontal arrows, `check`, `x`,
 * `plus`, `minus`, `magnifying-glass`, `info` and `warning`.
 *
 * **A small set, because a name is resolved through an index no bundler can
 * shake.** The whole set is 15 kB gzipped, and the family's entry used to
 * register all of it, so a page that drew one glyph by name shipped every one.
 * These thirteen cost about 700 bytes. A page that names any other glyph
 * imports `icon/all`, which registers the whole set, and an element whose
 * name resolves to nothing says which entry to add.
 */
registerIcons([
  arrowLeft,
  arrowRight,
  caretDown,
  caretLeft,
  caretRight,
  caretUp,
  check,
  info,
  magnifyingGlass,
  minus,
  plus,
  warning,
  x,
])
