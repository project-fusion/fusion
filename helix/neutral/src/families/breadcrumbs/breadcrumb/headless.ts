import {
  bind,
  box,
  derive,
  event,
  field,
  headless,
  pressable,
  prop,
  region,
  repeat,
  text,
  unless,
  when,
  wrap,
} from '../../../tree.js'

/**
 * A crumb's headless tier: a separator, then the crumb's link or its words.
 *
 * **The separator comes before the crumb**, and the first crumb draws none.
 * It is decorative, so a screen reader reads the crumbs alone.
 *
 * **A crumb with an `href` is a link** that asks with `before-select`, with
 * the `href` as its value, says `select` once it stands, and opens unless
 * the request was refused: on the web the
 * browser follows it, and on a phone the app's open-link, its router where
 * it set one. **The current page is words, whatever its `href`**, and a
 * phone says it is the current page after its words, since React Native has
 * no state for it. A crumb with neither is its words, or what is passed in,
 * such as a link or a menu of your own.
 *
 * **`end` holds a control after the label**, outside the link, such as a
 * switcher's menu button. The crumb is in its `end` state while it holds
 * something, and draws the two as one split control.
 *
 * **The first crumb of a trail that folds draws the fold after its label**:
 * a separator, and a menu its button opens, named by `fold-label` with the
 * count it folded, whose rows are the crumbs folded away, each a link to
 * its crumb's `href`. Choosing a row sends the crumb's `before-select` and
 * `select`, with the row's `href` as its value, and a refused one keeps its
 * link closed. The
 * trail hands the crumb what it folded.
 *
 * **What the trail writes is the web's**: the last crumb of a trail with
 * none marked `current` is said to be the current page there.
 *
 * **Held to `helix-breadcrumb`.** `helix family check` compares the props,
 * the event, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('breadcrumb', {
  derived: {
    'fold-emphasis': derive('breadcrumb-fold-emphasis'),
    'fold-mark': derive('breadcrumb-fold-mark'),
    'fold-name': derive('breadcrumb-fold-name'),
  },
  events: [
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
  ],
  host: { role: 'listitem' },
  props: [
    prop('current', 'boolean', { default: false }),
    prop('href', 'string'),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
    /* What a trail that folds hands its first crumb: how many it folded,
       the crumbs it folded, and the words that name the fold. */
    prop('fold', 'number', { attribute: false }),
    prop('fold-crumbs', 'object', { attribute: false }),
    prop('fold-label', 'string', { attribute: false }),
  ],
  states: ['current', 'end', 'folded', 'settled'],
  tree: [
    box('separator', { decorative: true }, [
      region('separator', {}, [box('separator-mark', { decorative: true, glyph: 'caret-right' })]),
    ]),
    /* A press that goes nowhere draws as words, so a crumb with no `href`
       holds a control of your own as a control. */
    unless(
      'current',
      pressable('link', { href: bind('href'), sends: 'before-select' }, [
        region('start'),
        region('default'),
      ]),
    ),
    when('current', box('link', { current: 'page' }, [region('start'), region('default')])),
    region('end'),
    when(
      'fold',
      box('fold-separator', { decorative: true }, [
        box('fold-separator-mark', { decorative: true, glyph: 'caret-right' }),
      ]),
    ),
    /* The menu of the crumbs folded away, which its button opens. */
    when(
      'fold',
      wrap(
        'fold',
        {
          bubbles: 'before-select select',
          draws: 'menu',
          exports: {
            back: true,
            'back-mark': true,
            empty: true,
            header: true,
            live: true,
            loading: true,
            'search-field': true,
            surface: true,
            title: true,
          },
          gives: { label: bind('fold-name') },
          while: true,
        },
        [
          wrap(
            'expand',
            {
              draws: 'icon-button',
              exports: { button: true, live: true, spinner: true, text: true },
              gives: { emphasis: bind('fold-emphasis'), label: bind('fold-name') },
              into: 'trigger',
              while: true,
            },
            [box('expand-mark', { draws: 'icon', gives: { name: bind('fold-mark') } })],
          ),
          repeat('fold-crumbs', { each: derive('breadcrumb-fold-items'), key: 'at' }, [
            wrap(
              'fold-item',
              {
                draws: 'menu-item',
                exports: {
                  end: true,
                  item: true,
                  mark: true,
                  shortcut: true,
                  'shortcut-kbd': true,
                  'shortcut-key': true,
                  'shortcut-separator': true,
                  start: true,
                  surface: true,
                },
                gives: { href: field('href'), value: field('href') },
                while: true,
              },
              [text('fold-words', { says: field('label') })],
            ),
          ]),
        ],
      ),
    ),
  ],
})
