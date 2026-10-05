import { icons } from '@fusion.dev/helix-icons'
import { registerIcons } from './registry.js'

/*
 * The whole Helix set, registered by name.
 *
 * The family's entry imports this, so `<helix-icon name="check">` draws with
 * nothing else written, as it always has. The element's own entry,
 * `icon/root`, leaves it out, so a page that registers the glyphs it names
 * ships those and not the 15 kB of the set.
 */
registerIcons(icons)
