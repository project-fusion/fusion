import {
  cancelable,
  headless,
  oneOf,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Kbd's headless tier: a keyboard key or chord, set inline with text.
 *
 * **One key, or the chord `keys` names.** The label passed in is the key,
 * and `keys` draws a chord in the reader's keyboard's own glyphs: `⌘K` on an
 * Apple keyboard, including an iPhone's or an iPad's, and `Ctrl+K`
 * elsewhere. A chord drawn in glyphs is said in words, `Command K`, on both
 * platforms. A phone announces the key as a keyboard key.
 *
 * **`caps` draws a key per key**, each a `key` part with a `separator` part
 * between two where the platform writes one. Where the chord is said in
 * words, it is said whole on both platforms: the web hides its keys, and a
 * phone's key is one element named by the words.
 *
 * **The shortcut is the web's so far.** `within` listens for the chord and
 * sends `helix-shortcut`, and `for` and `activate` write the chord onto the
 * control it works and focus or press that control, each found by id. A phone
 * draws the key and listens for nothing: its components name no other
 * component by id, and a chord from an iPad's keyboard reaches a component
 * only through the keys module of a development build.
 */
export default headless('kbd', {
  props: {
    activate: web(oneOf(['click', 'focus'])),
    caps: false,
    for: web(''),
    /* JSON on the web's attribute, such as `{"mod":"Command"}`. */
    keyLabels: string(),
    keys: '',
    within: web(oneOf(['control', 'document'])),
  },
  events: {
    shortcut: web(cancelable(['keys'])),
  },
  states: ['settled'],
  render: ({ entry, props }) => (
    <View
      element="key"
      label={derive('kbd-words')}
      part="kbd"
    >
      <Slot />
      {!props.caps && props.keys && (
        <Text
          label={derive('kbd-words')}
          part="chord"
        >
          {derive('kbd-keys')}
        </Text>
      )}
      {/* Only a chord `keys` names is drawn as caps: with no `keys`, the web
          draws the label passed in, under `caps` or not. */}
      {props.caps && props.keys && (
        <Repeat
          each={derive('kbd-key-list')}
          key="at"
          part="cap"
        >
          {/* Drawn only where the platform writes a separator: none before the
            first key, and none between two glyphs on an Apple keyboard. */}
          <Wrap
            part="separator"
            when={entry.separator}
          >
            <Text
              ariaHidden
              part="plus"
            >
              {entry.separator}
            </Text>
          </Wrap>
          <View part="key">
            <Text
              label={entry.said}
              part="label"
            >
              {entry.key}
            </Text>
          </View>
        </Repeat>
      )}
    </View>
  ),
})
