import {
  cancelable,
  headless,
  Image,
  oneOf,
  Repeat,
  Slot,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * Video Playlist Menu's headless tier: the playlist's entries as a Menu,
 * placed in the player's `controls` region, which a playlist cannot draw into.
 *
 * **It reads the playlist around it**: each entry is a row with its poster
 * and its name, the one playing checked, a disabled one passed by. Choosing a
 * row asks `before-select` with its `value`, which the playlist hears. The
 * trigger is passed into `trigger`, or the list glyph is drawn.
 *
 * **Held to `helix-video-playlist-menu`.**
 */
export default headless('video-playlist-menu', {
  props: {
    fallbackLabel: 'Episodes',
    label: '',
    placement: oneOf(
      [
        'bottom',
        'bottom-end',
        'bottom-start',
        'end',
        'end-end',
        'end-start',
        'start',
        'start-end',
        'start-start',
        'top',
        'top-end',
        'top-start',
      ],
      'top-end',
    ),
  },
  events: {
    beforeSelect: cancelable(['value']),
  },
  states: ['settled'],
  videoPlaylistMenu: {
    named: 'named',
    onBeforeSelect: 'beforeSelect',
    rows: 'rows',
  },
  render: ({ entry, props, videoPlaylistMenu }) => (
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
      gives={{ label: videoPlaylistMenu.named, placement: props.placement }}
      part="menu"
    >
      {/* An icon button on a phone, whose press the menu around it opens on. */}
      <Wrap
        draws="icon-button"
        exports={{ button: 'native', live: 'native', spinner: 'native', text: 'native' }}
        gives={{ emphasis: 'plain', label: videoPlaylistMenu.named }}
        into="trigger"
        part="trigger"
      >
        <Slot name="trigger">
          <View
            draws="icon"
            gives={{ name: 'list' }}
            part="trigger-mark"
            platform="native"
          />
        </Slot>
      </Wrap>
      <Repeat
        each={videoPlaylistMenu.rows}
        key="value"
        part="rows"
      >
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
          gives={{
            checkable: true,
            checked: entry.checked,
            disabled: entry.disabled,
            exclusive: true,
            value: entry.value,
          }}
          part="entry"
        >
          <Image
            alt=""
            part="poster"
            src={entry.poster}
          />
          <Text part="entry-words">{entry.label}</Text>
        </Wrap>
      </Repeat>
    </Wrap>
  ),
})
