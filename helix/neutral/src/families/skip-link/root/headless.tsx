import { headless, Pressable, Slot, Text } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A skip link's headless tier: a link at the start of a page that moves
 * keyboard focus past the header to the main content.
 *
 * **The web's alone.** A skip link answers a page whose header every
 * keyboard user tabs through before the content. A phone's screen has no
 * such page: VoiceOver and TalkBack move by headings and containers, and a
 * hardware keyboard moves between an app's focus groups, which already step
 * past a navigation bar. So a phone's `HelixSkipLink` draws nothing, and a
 * universal app's shared screens can write it for the web.
 *
 * **Held to `helix-skip-link`.** `helix system check` compares the props,
 * the states, the region, and the part with what the manifest says the
 * element has.
 */
export default headless('skip-link', {
  props: {
    fallbackLabel: 'Skip to content',
    href: '#main',
    label: '',
  },
  events: {},
  states: ['settled'],
  derived: {
    words: derive('skip-link-words'),
  },
  platform: 'web',
  render: ({ derived, props }) => (
    <Pressable
      href={props.href}
      part="link"
    >
      <Slot>
        <Text part="label-words">{derived.words}</Text>
      </Slot>
    </Pressable>
  ),
})
