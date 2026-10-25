import { bind, box, derive, headless, not, prop, region, text } from '../../../tree.js'

/**
 * Badge's headless tier: a count, a dot, or words, pinned to what it wraps.
 *
 * **The mark is worked out from the value**, by core's badge derivations, on
 * both platforms: no value is a dot, zero is blank and draws nothing a reader
 * hears, a count past `max` reads `{max}+`, and `format-options` writes a
 * count in `locale`, such as `1.2K`. `label` names the mark, with `{count}`
 * filled in. Each is a value the element computes, and the indicator carries
 * three of them as the web's `data-` flags its rules read: `data-dot` for no
 * value, `data-single` for one character, and `data-blank` for zero.
 *
 * **The indicator is a status**, named by its words. A phone draws it as one
 * element a screen reader reaches, and hides it while it says nothing: a
 * blank mark, or a dot with no label. The icon passed into the mark is
 * hidden from screen readers, as the count and `label` are what it says.
 *
 * **Describing the wrapped control is the web's.** The web element points
 * the first control it wraps at its words, so focusing it says "Inbox,
 * button, 8 unread". A phone has no reference from a passed-in child to a
 * sibling's words, so the control and the count are two stops.
 */
export default headless('badge', {
  derived: {
    blank: derive('badge-blank'),
    capped: derive('badge-capped'),
    dot: derive('badge-dot'),
    'has-icon': bind('icon'),
    shows: derive('badge-text'),
    single: derive('badge-single'),
    unset: derive('badge-unset'),
    words: derive('badge-words'),
  },
  events: [],
  props: [
    /* JSON on the web's attribute, such as `{"notation":"compact"}`. */
    prop('format-options', 'object'),
    prop('label', 'string', { default: '' }),
    prop('locale', 'string', { default: '' }),
    prop('max', 'number'),
    prop('value', 'number | string', { default: '' }),
  ],
  states: ['blank', 'capped', 'dot', 'has-icon', 'settled'],
  tree: [
    region('default'),
    box(
      'indicator',
      {
        'data-blank': bind('blank'),
        'data-dot': bind('unset'),
        'data-single': bind('single'),
        decorative: not('words'),
        label: bind('words'),
        role: 'status',
      },
      [
        region('icon', { decorative: true, part: 'icon' }),
        text('count', { decorative: bind('blank'), says: bind('shows') }),
      ],
    ),
  ],
})
