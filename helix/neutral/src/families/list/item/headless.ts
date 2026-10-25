import {
  bind,
  box,
  event,
  headless,
  item,
  pressable,
  prop,
  region,
  when,
  wrap,
} from '../../../tree.js'

/**
 * A list row's headless tier: what it takes, what it sends, and its parts.
 *
 * **Each region has a box of its own, and the layout is the boxes'.** The
 * leading content, the label and its description in a body, and the trailing
 * content, so the description sits under the label on every platform without a
 * stylesheet placing content from outside.
 *
 * **The row is `row-current` as well while it is current**, which is a second
 * token on the same part on the web.
 *
 * **Held to `helix-list-item`.** `helix family check` compares the props,
 * events, states, regions, and parts with what the manifest says the element
 * has.
 */
export default headless('list-item', {
  events: [event('action')],
  /* A row of its list's collection: a press on it chooses it, in a list that
     selects, and a `reorderable` list names its grip, which moves it. */
  item: item('list', { chooses: true, grip: 'grip' }),
  props: [
    prop('current', ['date', 'location', 'page', 'step', 'time', 'true']),
    prop('disabled', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
    /* What the list writes on its rows. */
    prop('focusable', 'boolean', { attribute: false }),
    prop('grip', 'string', { attribute: false }),
    prop('move', ['dragging', 'drop-after', 'drop-before'], { attribute: false }),
    prop('selected', 'boolean', { attribute: false }),
    prop('selection-only', 'boolean', { attribute: false, default: false }),
    /* A link's, for a row that is a destination. */
    prop('href', 'string', { default: '' }),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
  ],
  states: ['dragging', 'drop-after', 'drop-before', 'focus-visible', 'selected', 'settled'],
  tree: [
    pressable(
      'row',
      {
        also: { 'row-current': bind('current') },
        chooses: true,
        disabled: bind('disabled'),
        selected: bind('selected'),
      },
      [
        /* Everything but `end` is the link, so a control there is a control of
         its own. */
        wrap('link', { current: bind('current'), href: bind('href') }, [
          box('rail'),
          region('start', { part: 'start' }),
          box('body', {}, [
            region('default', { part: 'label' }),
            region('description', { part: 'description' }),
          ]),
        ]),
        region('end', { part: 'end' }),
        when(
          'grip',
          pressable('grip', { label: bind('grip') }, [
            box('grip-mark', { decorative: true, glyph: 'dots-six-vertical' }),
          ]),
        ),
      ],
    ),
  ],
})
