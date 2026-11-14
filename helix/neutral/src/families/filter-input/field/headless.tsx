import { headless, Slot, string } from '../../../render.js'

/**
 * Filter Field's headless tier: a field a filter can apply to, with its
 * comparisons as `FilterOperator`s and its values as `Option`s.
 *
 * **It draws nothing.** A `FilterMenu` and a `FilterInput`'s grammar read what it
 * holds, and its host is hidden, on a phone as on the web.
 */
export default headless('filter-field', {
  props: {
    label: '',
    name: string(),
  },
  events: {},
  states: ['settled'],
  render: () => <Slot />,
})
