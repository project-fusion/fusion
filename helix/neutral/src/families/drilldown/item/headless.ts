import {
  bind,
  box,
  derive,
  event,
  headless,
  item,
  pressable,
  prop,
  region,
  when,
} from '../../../tree.js'

/**
 * A drilldown row's headless tier: a row that is chosen, follows its link,
 * or opens a page of its own.
 *
 * **A row whose `page` holds rows opens that page** in place of the one
 * showing, and its caret says so. The rows passed into `page` are the
 * page's rows. A press on any other row asks with `before-select`, which a
 * handler may refuse, and says `select` once it stands, and a row with an
 * `href` follows its link once the request stands:
 * on the web the browser follows it, and on a phone the app's open-link.
 *
 * **The row is named by its label alone.** The words passed into
 * `description`, a line under the label, and into `end` describe it, a
 * phone's hint, as the web's `aria-describedby` reads them. `disabled`
 * keeps it from being chosen, and it stays a stop of the arrow keys.
 *
 * **In a drilldown under `navigation` the row is a list item** that holds a
 * link, or a button where it opens a page or goes nowhere, which the
 * drilldown writes as `listed`. Anywhere else it is a menu item.
 *
 * **The web's**: `rel`, `target`, and `download`, which a phone's open-link
 * has no use for.
 *
 * **Held to `helix-drilldown-item`.** `helix family check` compares the
 * props, the event, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('drilldown-item', {
  derived: {
    described: bind('description'),
    'has-page': bind('page'),
    'host-role': derive('drilldown-item-host-role'),
    popup: derive('drilldown-item-popup'),
    'row-role': derive('drilldown-item-role'),
  },
  events: [
    event('before-select', { cancelable: true, detail: ['value'] }),
    event('select', { detail: ['value'] }),
  ],
  host: { role: bind('host-role') },
  item: item('drilldown', { chooses: true, page: 'page' }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('href', 'string', { default: '' }),
    prop('value', 'string', { default: '' }),
    /* What the drilldown writes on its rows. */
    prop('focusable', 'boolean', { attribute: false, default: false }),
    prop('listed', 'boolean', { attribute: false, default: false }),
    /* A link's, for a row that is a destination. */
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
        describedby: 'description end',
        disabled: bind('disabled'),
        'focusable-when-disabled': true,
        href: bind('href'),
        popup: bind('popup'),
        role: bind('row-role'),
        sends: 'before-select',
      },
      [
        region('start'),
        box('label', {}, [region('default')]),
        region('description', { decorative: true }),
        region('end', { decorative: true }),
        when(
          'has-page',
          region('chevron', { decorative: true }, [
            box('mark', { decorative: true, glyph: 'caret-right' }),
          ]),
        ),
      ],
    ),
    region('page'),
  ],
})
