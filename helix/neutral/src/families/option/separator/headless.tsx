import { headless, View } from '../../../render.js'

/**
 * A rule between runs of an owner's options, in its headless tier. It draws
 * nothing of its own, and what it is lies on the host. **While a filter narrows
 * the list it goes**, since between what is left of two runs it separates nothing.
 *
 * **Held to `helix-option-separator`.** `helix system check` compares the props
 * and the states with what the manifest says the element has.
 */
export default headless('option-separator', {
  props: {},
  events: {},
  states: ['settled'],
  host: { role: 'separator' },
  optionGroup: {},
  render: () => (
    <View
      ariaHidden
      part="line"
      platform="native"
    />
  ),
})
