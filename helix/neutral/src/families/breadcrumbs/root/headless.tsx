import { headless, number, oneOf, Slot, View } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Breadcrumbs' headless tier: the trail of crumbs to the current page.
 *
 * **The host is the navigation landmark, named by `label`**, and it holds
 * the list of crumbs. A phone announces the host by the same role and name.
 *
 * **The crumbs are passed in, in order**, and each draws the separator
 * before it. A trail drawn from `items`, a property only, is the web's: a
 * phone's app maps its data to crumbs, as React does on the web.
 *
 * **With `max-items`, a long trail folds its middle into a menu**: the first
 * crumb and the last `max-items` less one stay, and the first draws a
 * button named by `expand-label`, with `{count}` the crumbs it folded, that
 * opens a menu of them, each a link to its crumb. A trail drawn from `items`
 * is the web's, and folds the same way.
 *
 * **Held to `helix-breadcrumbs`.** `helix system check` compares the props,
 * the region, and the parts with what the manifest says the element has.
 */
export default headless('breadcrumbs', {
  props: {
    expandLabel: 'Show {count} more',
    fallbackLabel: 'Breadcrumb',
    label: '',
    maxItems: number(),
    /* The mark between crumbs for the whole trail: unset a chevron, `slash` a
       slash. */
    separator: oneOf(['slash']),
  },
  events: {},
  states: ['settled'],
  derived: {
    name: derive('breadcrumbs-name'),
  },
  maxVisible: {
    middle: { count: 'fold', items: 'foldCrumbs', label: 'foldLabel', words: 'expandLabel' },
    prop: 'maxItems',
  },
  host: { label: bind('name'), role: 'navigation' },
  render: () => (
    <View
      part="list"
      role="list"
    >
      {/* A crumb drawn from `items`, a `helix-breadcrumb` whose parts it
          exposes, the fold among them. */}
      <View
        also={{ 'crumb-current': true }}
        draws="breadcrumb"
        exports={{
          expand: true,
          'expand-button': true,
          'expand-live': true,
          'expand-mark': true,
          'expand-spinner': true,
          'expand-text': true,
          fold: true,
          'fold-back': true,
          'fold-back-mark': true,
          'fold-empty': true,
          'fold-header': true,
          'fold-item': true,
          'fold-item-end': true,
          'fold-item-item': true,
          'fold-item-mark': true,
          'fold-item-shortcut': true,
          'fold-item-shortcut-kbd': true,
          'fold-item-shortcut-key': true,
          'fold-item-shortcut-separator': true,
          'fold-item-start': true,
          'fold-item-surface': true,
          'fold-live': true,
          'fold-loading': true,
          'fold-search-field': true,
          'fold-separator': true,
          'fold-separator-mark': true,
          'fold-surface': true,
          'fold-title': true,
          link: true,
          separator: true,
          'separator-mark': true,
        }}
        part="crumb"
        platform="web"
      />
      <Slot />
    </View>
  ),
})
