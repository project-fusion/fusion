import { cancelable, headless, Image, Pressable, property, Slot, View } from '../../../render.js'

/**
 * A playlist entry's headless tier: one clip, a press with its thumbnail and
 * its name, which asks the playlist to play it.
 *
 * **The playlist decides which entry is current**, and passes it as
 * `current`: the entry is `item-current`, says so to a screen reader, and
 * shows its `indicator`. A press asks `before-select` with its `value`, which
 * the playlist hears. `disabled` passes the entry by.
 *
 * **`poster` is the thumbnail**, which the `media` region replaces, and the
 * `meta` region stands under the name.
 *
 * **Held to `helix-video-playlist-item`.**
 */
export default headless('video-playlist-item', {
  props: {
    /* Set by the playlist, which knows which entry plays. */
    current: property(false),
    disabled: false,
    poster: '',
    src: '',
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
  },
  states: ['current', 'dragging', 'dropAfter', 'dropBefore', 'settled'],
  render: ({ props, send }) => (
    <View
      part="container"
      role="listitem"
    >
      <Pressable
        also={{ 'item-current': props.current }}
        current={props.current}
        disabled={props.disabled}
        onPress={send.beforeSelect}
        part="item"
        role="button"
      >
        <View part="media">
          <Slot name="media">
            {props.poster && (
              <Image
                alt=""
                part="thumbnail"
                src={props.poster}
              />
            )}
          </Slot>
        </View>
        <View part="label">
          <Slot />
          <Slot name="meta" />
        </View>
        {props.current && (
          <Slot
            name="indicator"
            part="indicator"
          />
        )}
      </Pressable>
    </View>
  ),
})
