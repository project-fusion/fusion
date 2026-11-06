import { Announce, cancelable, headless, oneOf, Slot, string, Text, View } from '../../../render.js'

/**
 * Video Playlist's headless tier: a list of clips that play one after another
 * in the one player passed into `player`.
 *
 * **The playlist plays no media.** It points the player at the current
 * entry's `src` and `poster`, names it by the entry, and plays it once a
 * reader chose it. On the web it sets the player's properties; on a phone it
 * passes them to the player as it draws it, and plays through the player's
 * handle, so the web is unchanged.
 *
 * **The current entry moves** on a press, on the player's previous and next,
 * and at the end of a clip, through core's `queue`: `no-advance` stays put,
 * `repeat` plays the one again or goes round, `shuffle` deals the order, and
 * without them the last entry sends `end`. A move asks `before-activate`, with
 * why in `cause`, then sends `activate`, and the entry is said in the words of
 * `playing-label`.
 *
 * **The web's**: moving entries under `reorderable`, by the keys and by a drag,
 * and its words, and Shift with N or P on the player. A phone's entries keep
 * their order.
 *
 * **Held to `helix-video-playlist`.**
 */
export default headless('video-playlist', {
  props: {
    active: string(),
    canceledLabel: 'Canceled',
    defaultActive: '',
    droppedLabel: 'Dropped',
    emptyLabel: string(),
    emptyText: 'No videos',
    fallbackLabel: 'Playlist',
    label: '',
    movedLabel: '{name} moved to position {position} of {count}',
    noAdvance: false,
    pickedUpLabel: 'Picked up {name}',
    playingLabel: 'Now playing {title}',
    reorderable: false,
    repeat: oneOf(['all', 'one']),
    shuffle: false,
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['cause', 'value']),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'to', 'value']),
    end: [],
    reorder: ['from', 'key', 'keys', 'kind', 'to', 'value'],
  },
  states: ['ended', 'settled'],
  videoPlaylist: {
    empty: 'empty',
    emptyWords: 'emptyWords',
    named: 'named',
    onActivate: 'activate',
    onBeforeActivate: 'beforeActivate',
    onEnd: 'end',
  },
  render: ({ videoPlaylist }) => (
    <>
      <View part="player">
        <Slot name="player" />
      </View>
      <View
        label={videoPlaylist.named}
        part="items"
        role="list"
      >
        <Slot />
      </View>
      {videoPlaylist.empty && (
        <View part="empty">
          <Slot name="empty">
            <Text part="empty-words">{videoPlaylist.emptyWords}</Text>
          </Slot>
        </View>
      )}
      <Announce
        part="live"
        platform="web"
      />
    </>
  ),
})
