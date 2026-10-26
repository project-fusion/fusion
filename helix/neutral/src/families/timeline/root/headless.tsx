import { headless, Slot, string, Text, View, web } from '../../../render.js'
import { bind } from '../../../tree.js'

/**
 * A timeline's headless tier: a list of events, in the order they happened.
 *
 * **The host is the list**, named by `label`, and each entry and each group
 * of entries is an item of it. A timeline records what happened or is
 * scheduled: no entry is current or complete, which is `Steps`' job.
 *
 * **A feed that loads more sets `loading`.** The timeline is busy, and an
 * entry after the last says so: `loading-text`, or content passed into
 * `loading`.
 *
 * **Held to `helix-timeline`.** `helix family check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('timeline', {
  props: {
    label: '',
    loading: false,
    /* The old name of `loading-text`, which the web reads for one release. */
    loadingLabel: web(string()),
    loadingText: 'Loading more',
  },
  events: {},
  states: ['loading', 'settled'],
  host: { busy: bind('loading'), label: bind('label'), role: 'list' },
  render: ({ props }) => (
    <>
      <Slot />
      {props.loading && (
        <View
          part="loading"
          role="listitem"
        >
          <Slot name="loading">
            <Text part="loading-text">{props.loadingText}</Text>
          </Slot>
        </View>
      )}
    </>
  ),
})
