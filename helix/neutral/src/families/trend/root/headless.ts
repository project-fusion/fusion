import { box, derive, headless, not, prop, region, text, unless, when } from '../../../tree.js'

/**
 * Trend's headless tier: which way a measurement moved, and whether that is
 * good.
 *
 * **The movement and the judgment are worked out from the props**, by core's
 * trend derivations, on both platforms: `movement`, then the old
 * `direction`, then the sign of `value` for the movement, and `good` for
 * whether it is better or worse. Each is a state, `up`, `down`, `better` or
 * `worse`, which the styled tier colors by.
 *
 * **The arrow is the glyph for the movement**, `arrow-up`, `arrow-down` or
 * `minus`, in the trend's color. A glyph passed into `up-icon`, `down-icon` or
 * `neutral-icon` stands in for the one that matches, and one in `icon` for all
 * three. Every one is hidden from screen readers, since the movement is said
 * in words: the `direction` part, out of sight, says "Up, better", in the
 * words the six `*-label` props and the words registry give.
 *
 * **`value` writes the change** in the `value` part with `format-options` in
 * `locale`, the size without a sign unless `signDisplay` asks for one. A phone
 * reads the reader's locale where `locale` is empty.
 *
 * **The deprecation warning for `direction` is the web's.** A phone has no
 * diagnostics channel yet, and reads the old prop as the web does.
 */
export default headless('trend', {
  derived: {
    better: derive('trend-better'),
    down: derive('trend-down'),
    figure: derive('trend-figure'),
    up: derive('trend-up'),
    worse: derive('trend-worse'),
  },
  events: [],
  props: [
    prop('better-label', 'string', { default: 'better' }),
    prop('direction', ['down', 'neutral', 'up']),
    prop('down-label', 'string', { default: 'Down' }),
    /* JSON on the web's attribute, such as `{"style":"percent"}`. */
    prop('format-options', 'object'),
    prop('good', ['down', 'up']),
    prop('judgment-label', 'string', {
      default:
        '{judgment, select, better {{direction}, {betterLabel}} worse {{direction}, {worseLabel}} other {{direction}}}',
    }),
    prop('locale', 'string', { default: '' }),
    prop('movement', ['down', 'neutral', 'up']),
    prop('unchanged-label', 'string', { default: 'Unchanged' }),
    prop('up-label', 'string', { default: 'Up' }),
    prop('value', 'number'),
    prop('worse-label', 'string', { default: 'worse' }),
  ],
  states: ['better', 'down', 'settled', 'up', 'worse'],
  tree: [
    when(
      'up',
      region('up-icon', { decorative: true }, [
        region('icon', { decorative: true }, [
          box('icon', { decorative: true, glyph: 'arrow-up' }),
        ]),
      ]),
    ),
    when(
      'down',
      region('down-icon', { decorative: true }, [
        region('icon', { decorative: true }, [
          box('icon', { decorative: true, glyph: 'arrow-down' }),
        ]),
      ]),
    ),
    unless(
      'up',
      unless(
        'down',
        region('neutral-icon', { decorative: true }, [
          region('icon', { decorative: true }, [box('icon', { decorative: true, glyph: 'minus' })]),
        ]),
      ),
    ),
    box('direction', {}, [text('said', { says: derive('trend-said') })]),
    box('value', { hidden: not('figure') }, [text('figure', { says: derive('trend-figure') })]),
    region('default'),
    region('label'),
  ],
})
