import { cancelable, headless, Slot, View, Wrap } from '../../../render.js'

/**
 * Filter Menu's headless tier: a menu for building a filter, a row for each
 * `FilterField` it holds, whose page offers the field's comparisons and checks its
 * values.
 *
 * **It holds what is ticked**, field by field, and each change asks `before-facet`
 * with the field's whole set, which a handler may refuse, then says `facet`. In a
 * `FilterInput` the field around hears both, as the web's events bubble to it, and
 * a chip the field removes or a filter typed in it is applied here.
 *
 * **A phone draws the menu's rows from the fields**, as the web does, with Menu's own
 * elements: a field's row opens its page, a comparison is one of a run, and a value
 * of a field whose comparison takes one value is one of a run too.
 *
 * **Held to `helix-filter-menu`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('filter-menu', {
  props: {
    fallbackLabel: 'Filter',
    label: '',
  },
  events: {
    beforeFacet: cancelable(['arity', 'field', 'label', 'operator', 'operatorLabel', 'values']),
    facet: ['arity', 'field', 'label', 'operator', 'operatorLabel', 'values'],
  },
  states: ['settled'],
  filterMenu: {
    fallbackLabel: 'fallbackLabel',
    label: 'label',
    onBeforeFacet: 'beforeFacet',
    onFacet: 'facet',
  },
  render: () => (
    <Wrap
      draws="menu"
      exports={{
        back: true,
        'back-mark': true,
        empty: true,
        header: true,
        live: true,
        loading: true,
        'search-field': true,
        surface: true,
        title: true,
      }}
      part="menu"
    >
      <Wrap
        into="trigger"
        part="trigger"
        platform="native"
      >
        <Slot name="trigger" />
      </Wrap>
      <Slot />
      {/* The rows the web element writes from its fields, a phone's from its machine. */}
      <Wrap
        draws="menu-item"
        exports={{
          end: true,
          item: true,
          mark: true,
          shortcut: true,
          'shortcut-kbd': true,
          'shortcut-key': true,
          'shortcut-separator': true,
          start: true,
          surface: true,
        }}
        part="entry"
        platform="web"
      >
        <View
          draws="divider"
          exports={{ content: true, line: true }}
          part="divider"
        />
      </Wrap>
    </Wrap>
  ),
})
