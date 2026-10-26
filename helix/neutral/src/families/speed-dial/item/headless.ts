import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  not,
  pressable,
  prop,
  region,
  text,
} from '../../../tree.js'

/**
 * A speed dial action's headless tier: a round mark and its name, which a
 * press chooses.
 *
 * **A press asks with `before-select`** and the action's `value`, which a
 * handler may refuse, then says `select`, and its dial closes once it
 * stands. An action with an `href` follows its link once the request
 * stands: on the web the browser follows
 * it, and on a phone the app's open-link. `disabled` keeps it from being
 * chosen.
 *
 * **`shortcut` shows the action's keyboard shortcut after its name**, in
 * the reader's keyboard's glyphs, `⌘S` on an Apple keyboard and `Ctrl+S`
 * elsewhere. It binds nothing. A `Kbd` passed into `shortcut` takes its
 * place on the web.
 *
 * **The web's**: `rel`, `target`, `download`, the `shortcut` region, and
 * `aria-keyshortcuts`, which React Native has no equivalent of.
 *
 * **Held to `helix-speed-dial-item`.** `helix family check` compares the
 * props, the event, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('speed-dial-item', {
  derived: {
    'shortcut-words': derive('speed-dial-shortcut'),
    'shows-shortcut': derive('speed-dial-shows-shortcut'),
  },
  events: [
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
  ],
  item: item('speed-dial', { chooses: true }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('href', 'string', { default: '' }),
    prop('shortcut', 'string', { default: '' }),
    prop('value', 'string', { default: '' }),
    /* A link's, for an action that is a destination. */
    prop('download', 'boolean', { default: false, platform: 'web' }),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
  ],
  states: ['settled'],
  tree: [
    pressable(
      'item',
      {
        chooses: true,
        disabled: bind('disabled'),
        href: bind('href'),
        role: 'menuitem',
        sends: 'before-select',
      },
      [
        box('icon', {}, [region('icon')]),
        box('label', {}, [
          region('default'),
          box('shortcut', { decorative: true, hidden: not('shows-shortcut') }, [
            region('shortcut', { platform: 'web' }),
            text('shortcut-words', { platform: 'native', says: bind('shortcut-words') }),
          ]),
        ]),
      ],
    ),
  ],
})
