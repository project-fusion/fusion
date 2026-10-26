import { cancelable, headless, Pressable, property, Slot, set, View, web } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

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
  memberOf: set('drilldown', { page: 'page' }),
  props: {
    disabled: false,
    /* `download`, `rel`, and `target` are a link's, for a row that is a
       destination. */
    download: web(false),
    /* `focusable` and `listed` are what the drilldown writes on its rows. */
    focusable: property(false),
    href: '',
    listed: property(false),
    rel: web(''),
    target: web(''),
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
    select: ['value'],
  },
  states: ['settled'],
  derived: {
    described: bind('description'),
    hasPage: bind('page'),
    hostRole: derive('drilldown-item-host-role'),
    popup: derive('drilldown-item-popup'),
    rowRole: derive('drilldown-item-role'),
  },
  host: { role: bind('host-role') },
  render: ({ derived, props, send }) => (
    <>
      <Pressable
        chooses
        describedby="description end"
        disabled={props.disabled}
        focusable-when-disabled
        href={props.href}
        onPress={send.beforeSelect}
        part="item"
        popup={derived.popup}
        role={derived.rowRole}
      >
        <Slot name="start" />
        <View part="label">
          <Slot />
        </View>
        <Slot
          ariaHidden
          name="description"
        />
        <Slot
          ariaHidden
          name="end"
        />
        {derived.hasPage && (
          <Slot
            ariaHidden
            name="chevron"
          >
            <View
              ariaHidden
              icon="caret-right"
              part="mark"
            />
          </Slot>
        )}
      </Pressable>
      <Slot name="page" />
    </>
  ),
})
