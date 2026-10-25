import {
  bind,
  box,
  collection,
  event,
  headless,
  live,
  not,
  prop,
  region,
  text,
  when,
} from '../../../tree.js'

/**
 * A list's headless tier: what it takes, what it sends, and its parts.
 *
 * **The list holds which rows are selected, and its rows join it.** A row is
 * an item of the list's collection by its `value`. How many a reader can
 * select is `selection-mode`, and what a press does to the rows already
 * selected is `selection-behavior`.
 *
 * **The list numbers its rows.** Where the count starts is `start`, and
 * `reversed` counts down from the number of rows. The rows read the first
 * number and the step as `--list-first` and `--list-step`, which the counters
 * of an ordered list and its rail add up.
 *
 * **Held to `helix-list`.** `helix family check` compares the props, events,
 * states, regions, and parts with what the manifest says the element has.
 */
export default headless('list', {
  collection: collection({
    after: 'change',
    before: 'before-change',
    behavior: 'selection-behavior',
    chosen: 'value',
    counts: { first: 'list-first', reversed: 'reversed', start: 'start', step: 'list-step' },
    empty: 'empty',
    /* **The keys only move focus down the rows, and stop at the ends**, as
       the web's list does. Left and Right are the row's own. */
    keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
    mode: 'selection-mode',
    /* **A `reorderable` list lets a reader move its rows**, by a grip on each
       row. It moves no row itself: it asks with `before-reorder`, then says
       the new order in `reorder`, and the page moves its rows. */
    reorder: {
      after: 'reorder',
      before: 'before-reorder',
      canceled: 'canceled-label',
      dropped: 'dropped-label',
      enabled: 'reorderable',
      move: 'move-label',
      moved: 'moved-label',
      picked: 'picked-up-label',
      preview: 'drag-preview',
    },
  }),
  events: [
    event('action'),
    event('before-change', { cancelable: true, detail: ['value'] }),
    event('before-reorder', { cancelable: true, detail: ['keys'] }),
    /* The platform's own name, as a form control sends it. */
    event('change', { bare: true }),
    event('load-more'),
    event('reorder', { cancelable: true, detail: ['keys'] }),
  ],
  props: [
    prop('disabled-behavior', ['all', 'selection']),
    prop('empty-label', 'string', { default: '' }),
    prop('kind', ['default', 'description', 'ordered', 'unordered']),
    prop('label', 'string', { default: '' }),
    prop('load-more', 'boolean', { default: false }),
    prop('loading', 'boolean', { default: false }),
    prop('loading-label', 'string', { default: 'Loading more' }),
    prop('reorderable', 'boolean', { default: false }),
    prop('reversed', 'boolean', { default: false }),
    prop('selection-behavior', ['replace', 'toggle'], { default: 'toggle' }),
    prop('selection-mode', ['multiple', 'none', 'single']),
    prop('start', 'number'),
    prop('type', ['1', 'a', 'A', 'i', 'I']),
    prop('value', 'string', { default: '' }),
    /* What a reorder says to a screen reader, step by step. */
    prop('canceled-label', 'string', { default: 'Canceled' }),
    prop('dropped-label', 'string', { default: 'Dropped' }),
    prop('move-label', 'string', { default: 'Move {name}' }),
    prop('moved-label', 'string', { default: '{name} moved to position {position} of {count}' }),
    prop('picked-up-label', 'string', { default: 'Picked up {name}' }),
  ],
  states: ['empty', 'loading', 'settled'],
  tree: [
    region('default'),
    when(
      'loading',
      box('loading', { role: 'listitem' }, [
        region('loading', {}, [text('loading-words', { says: bind('loading-label') })]),
      ]),
    ),
    when(
      'empty',
      box('empty', { hidden: not('empty-label'), role: 'listitem' }, [
        region('empty', {}, [text('empty-words', { says: bind('empty-label') })]),
      ]),
    ),
    /* A pointer's move, and what it says on the way, are the web's for now. */
    live('live', { platform: 'web' }),
    box('drag-preview', { decorative: true, platform: 'web' }),
  ],
})
