import { Announce, headless, number, Slot, Text, View } from '../../../render.js'

/**
 * Empty's headless tier: what it takes and its regions.
 *
 * **Each region is a part**, drawn in order: the icon, the heading, the
 * message, and the actions. A `heading` given as words is drawn as a heading
 * of `heading-level`, which the heading region falls back to. A phone
 * announces a heading with no level.
 *
 * **An empty view says its heading as it arrives.** The web element says
 * the heading and the message once when it appears after the page has
 * loaded, and holds them out of the tree while its live copy says them. A
 * phone says the heading as the view is drawn, and again each time it is
 * drawn anew, through the announce capability, unless `no-announce` holds,
 * and its words are read where they are as well. Wrapping a slotted element
 * that is no heading in the heading part reads the element's kind, which is
 * the web's.
 *
 * **Held to `helix-empty`.** `helix family check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('empty', {
  props: {
    heading: '',
    headingLevel: number(),
    noAnnounce: false,
  },
  events: {},
  states: ['has-actions', 'has-icon', 'settled'],
  render: ({ props }) => (
    <>
      <Slot
        name="icon"
        part="icon"
      />
      <Slot name="heading">
        {props.heading && (
          <View
            level={props.headingLevel}
            part="heading"
            role="heading"
          >
            <Text part="heading-words">{props.heading}</Text>
          </View>
        )}
      </Slot>
      <Slot part="message" />
      <Slot
        name="actions"
        part="actions"
      />
      <Announce
        part="live"
        platform="web"
      />
      <Announce
        arrives
        part="arrival"
        platform="native"
        when={!props.noAnnounce}
      >
        {props.heading}
      </Announce>
    </>
  ),
})
