import { bind, box, event, headless, not, prop } from '../../../tree.js'

/**
 * Icon's headless tier: what it takes, what it sends, and its one part.
 *
 * **The glyph is named, and the platform draws it.** The web element looks
 * the name up in its registry and draws the glyph's markup in an `<svg>`. A
 * phone draws it with the `Glyph` that `HelixRoot` is given, such as
 * `glyphs()` over `@fusion.dev/helix-icons`, in the color of the words
 * around it and at the size of the icon's box.
 *
 * **Decorative unless it is labeled.** An icon with no `label` sits beside
 * words that already say what it means, so it is hidden from screen readers.
 * A label makes it an image with that name.
 *
 * **A file and the events that report one are the web's.** A phone fetches no
 * SVG file, and its `Glyph` draws nothing for a name it does not know, so
 * neither `load` nor `error` has anything to report there. The `icon` property,
 * which takes a glyph as an object, is the web element's own and is not a
 * prop here.
 */
export default headless('icon', {
  events: [
    event('error', { bare: true, platform: 'web' }),
    event('load', { bare: true, platform: 'web' }),
  ],
  props: [
    prop('label', 'string', { default: '' }),
    prop('mirror', 'boolean', { default: false }),
    prop('name', 'string', { default: '' }),
    prop('src', 'string', { default: '', platform: 'web' }),
  ],
  states: ['settled'],
  tree: [
    box('svg', {
      decorative: not('label'),
      glyph: bind('name'),
      label: bind('label'),
      role: 'img',
    }),
  ],
})
