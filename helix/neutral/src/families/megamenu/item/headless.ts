import { bind, box, event, headless, item, pressable, prop, region, wrap } from '../../../tree.js'

/**
 * A megamenu item's headless tier: one destination of a megamenu's panel,
 * a link with a name, a line about it, and an icon.
 *
 * **The item is a link to its `href`**, which asks with `before-select`,
 * the `href` as its value, says `select` once it stands, and opens unless
 * the request was refused: on the web
 * the browser follows it, and on a phone the app's open-link, its router
 * where it set one. **A press that stands closes the megamenu around it**,
 * as its set's `closes` says. An item with no `href` draws its words as a
 * box.
 *
 * **Its words are its name**, an icon passed into `icon` stands before
 * them, and a sentence passed into `description` under them. A screen
 * reader hears the name and the sentence as the link's words, as the web
 * names a link by the words inside it.
 *
 * **`current` says the item is the page the reader is on**, with
 * `aria-current`'s values, and the page writes it: the megamenu around it
 * is `current` while one of its items is the page. A phone says "Current
 * page", or the words for its value, after the item's words.
 *
 * **The item stands for its `href` in its megamenu**, which knows it by it.
 *
 * **The web's**: `rel` and `target`, which a phone's open-link has no use
 * for.
 *
 * **Held to `helix-megamenu-item`.** `helix family check` compares the
 * props, the event, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('megamenu-item', {
  events: [
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
  ],
  item: item('megamenu', { chooses: true, flag: 'current', value: 'href' }),
  props: [
    prop('current', ['date', 'location', 'page', 'step', 'time', 'true']),
    prop('href', 'string', { default: '' }),
    prop('rel', 'string', { default: '', platform: 'web' }),
    prop('target', 'string', { default: '', platform: 'web' }),
  ],
  states: ['has-description', 'has-icon', 'settled'],
  tree: [
    pressable(
      'link',
      {
        chooses: true,
        current: bind('current'),
        href: bind('href'),
        sends: 'before-select',
      },
      [
        region('icon', { part: 'icon' }),
        /* The name over the line about it on a phone, which the web stands
           in the link's two rows. */
        wrap('words', { platform: 'native', while: true }, [
          box('name', {}, [region('default')]),
          region('description', { part: 'description' }),
        ]),
      ],
    ),
  ],
})
