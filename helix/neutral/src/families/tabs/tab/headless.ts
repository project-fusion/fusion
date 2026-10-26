import { bind, box, event, headless, item, pressable, prop, region, when } from '../../../tree.js'

/**
 * A tab's headless tier.
 *
 * **A tab is an item of its tab set**, chosen when its `value` is the set's,
 * and pressing it chooses it. `selected` is the set's word: a tab with no set
 * around it reads its own.
 *
 * **A dismissible tab closes from a mark that is for the pointer.** The mark
 * is hidden from screen readers, so the tab offers the same press to them as
 * an action of its own. The tab does not remove itself: its owner does.
 */
export default headless('tab', {
  events: [
    event('dismiss', { cancelable: true, detail: ['label'] }),
    event('before-select', { cancelable: true, detail: ['value'] }),
  ],
  item: item('tabs', { chooses: true }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('dismiss-label', 'string', { default: 'Close' }),
    prop('dismissible', 'boolean', { default: false }),
    prop('selected', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
    /* A link's, for tabs a router drives, each still controlling its panel. */
    prop('href', 'string'),
    prop('rel', 'string', { platform: 'web' }),
    prop('target', 'string', { platform: 'web' }),
  ],
  states: ['selected', 'settled'],
  tree: [
    pressable(
      'tab',
      {
        chooses: true,
        disabled: bind('disabled'),
        href: bind('href'),
        role: 'tab',
        selected: bind('selected'),
        sends: 'before-select',
      },
      [
        region('default', { part: 'label' }),
        when(
          'dismissible',
          pressable(
            'dismiss',
            {
              decorative: true,
              disabled: bind('disabled'),
              label: bind('dismiss-label'),
              sends: 'dismiss',
            },
            [region('dismiss-icon', {}, [box('dismiss-mark', { decorative: true, glyph: 'x' })])],
          ),
        ),
      ],
    ),
  ],
})
