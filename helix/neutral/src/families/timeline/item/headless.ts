import {
  bind,
  box,
  clock,
  derive,
  headless,
  pick,
  prop,
  region,
  text,
  wrap,
} from '../../../tree.js'

/**
 * A timeline entry's headless tier: when it happened, and what it was.
 *
 * **The mark is an image named by the meaning**, the tone's word and
 * `pending-label` where either applies, so the color is not the only place
 * the tone is. A mark passed into `marker` is named the same way. With no
 * name, the mark is decoration.
 *
 * **`relative` writes the time as how long ago it was** from `datetime`,
 * where nothing is passed into `time`, with the whole date as its
 * description. The words move on as they go stale, on a clock that starts
 * again as `datetime` or `relative` changes.
 *
 * **Without a subgrid, a phone draws the entry in two rows**: the line that
 * arrives beside the time, then the mark and the rest of the line beside
 * what happened, so the mark sits on what happened as the web's subgrid puts
 * it there. Each layout of the timeline places the time where the web does:
 * over what happened, on the other side of the line, or under the mark. The
 * copies of the time a layout does not use are not drawn.
 *
 * **The web's**: the `<time>` element and its `datetime`, and the whole date
 * as a pointer's title.
 *
 * **Held to `helix-timeline-item`.** `helix family check` compares the props,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('timeline-item', {
  clock: clock({ expires: 'timeline-item-expires', restarts: ['datetime', 'relative'] }),
  derived: {
    glyph: derive('timeline-item-glyph'),
    'mark-name': derive('timeline-item-mark-name'),
    'mark-unnamed': derive('timeline-item-mark-unnamed'),
    reading: derive('timeline-item-reading'),
    whole: derive('timeline-item-whole'),
  },
  events: [],
  host: { role: 'listitem' },
  props: [
    prop('datetime', 'time', { default: '' }),
    prop('pending', 'boolean', { default: false }),
    prop('pending-label', 'string', { default: 'Scheduled' }),
    prop('relative', ['long', 'narrow', 'short']),
    prop('tone', ['danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    prop('tone-label', 'string', { default: '' }),
    prop('tone-labels', 'object'),
  ],
  states: ['settled'],
  tree: [
    /* A phone's first row: the line that arrives, beside the time. */
    wrap('head', { platform: 'native', while: true }, [
      box('head-lead', { decorative: true, platform: 'native' }),
      box('arrive', { decorative: true, platform: 'native' }),
      box('time', { description: bind('whole') }, [
        region('time', {}, [text('reading', { says: bind('reading') })]),
      ]),
    ]),
    /* A phone's second row: the mark and the rest of the line, beside what
       happened. The time stands before the line where the time is on the
       other side, and over what happened where the line runs across. */
    wrap('body', { platform: 'native', while: true }, [
      box('lead', { platform: 'native' }, [
        box('beside', { platform: 'native' }, [
          box('time', { description: bind('whole'), platform: 'native' }, [
            region('time', {}, [text('reading', { says: bind('reading') })]),
          ]),
        ]),
      ]),
      box('rail', {}, [
        box(
          'marker',
          {
            decorative: bind('mark-unnamed'),
            label: bind('mark-name'),
            role: pick('mark-unnamed', { false: 'img' }, ''),
          },
          [region('marker', {}, [box('dot', { decorative: true, glyph: bind('glyph') })])],
        ),
      ]),
      wrap('main', { platform: 'native', while: true }, [
        box('above', { platform: 'native' }, [
          box('time', { description: bind('whole'), platform: 'native' }, [
            region('time', {}, [text('reading', { says: bind('reading') })]),
          ]),
        ]),
        box('content', {}, [region('default')]),
      ]),
    ]),
  ],
})
