/*
 * The element with every glyph of the Helix set registered by name:
 * `@fusion.dev/helix-headless/icon/all`.
 *
 * The family's entry registers a small set, so a page that draws a few
 * glyphs by name does not ship the other hundred. A page that names glyphs
 * from the whole set imports this entry instead, and pays the 15 kB gzipped
 * that the index of every glyph costs.
 */
import { icons } from '@fusion.dev/helix-icons'
import { registerIcons } from '../registry.js'

registerIcons(icons)

export * from '../index.js'
