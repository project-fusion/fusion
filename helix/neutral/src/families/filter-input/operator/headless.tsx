import { headless, oneOf, string, View } from '../../../render.js'

/**
 * Filter Operator's headless tier: one way a filter can compare a field to its
 * values, declared inside a `FilterField`.
 *
 * **It draws nothing.** The menu and the grammar read it, and its host is hidden,
 * on a phone as on the web.
 */
export default headless('filter-operator', {
  props: {
    arity: oneOf(['many', 'none', 'one']),
    default: false,
    label: '',
    name: string(),
  },
  events: {},
  states: ['settled'],
  render: () => (
    <View
      ariaHidden
      part="declared"
      platform="native"
    />
  ),
})
