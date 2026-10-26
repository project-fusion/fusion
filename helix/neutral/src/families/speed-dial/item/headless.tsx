import { cancelable, headless, Pressable, Slot, set, Text, View, web } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A speed dial action's headless tier: a round mark and its name, which a
 * press chooses.
 *
 * **A press asks with `before-select`** and the action's `value`, which a
 * handler may refuse, then says `select`, and its dial closes once it
 * stands. An action with an `href` follows its link once the request
 * stands: on the web the browser follows
 * it, and on a phone the app's open-link. `disabled` keeps it from being
 * chosen.
 *
 * **`shortcut` shows the action's keyboard shortcut after its name**, in
 * the reader's keyboard's glyphs, `⌘S` on an Apple keyboard and `Ctrl+S`
 * elsewhere. It binds nothing. A `Kbd` passed into `shortcut` takes its
 * place on the web.
 *
 * **The web's**: `rel`, `target`, `download`, the `shortcut` region, and
 * `aria-keyshortcuts`, which React Native has no equivalent of.
 *
 * **Held to `helix-speed-dial-item`.** `helix family check` compares the
 * props, the event, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('speed-dial-item', {
  memberOf: set('speed-dial'),
  props: {
    disabled: false,
    /* `download`, `rel`, and `target` are a link's, for an action that is a
       destination. */
    download: web(false),
    href: '',
    rel: web(''),
    shortcut: '',
    target: web(''),
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
    select: ['value'],
  },
  states: ['settled'],
  derived: {
    shortcutWords: derive('speed-dial-shortcut'),
    showsShortcut: derive('speed-dial-shows-shortcut'),
  },
  render: ({ derived, props, send }) => (
    <Pressable
      chooses
      disabled={props.disabled}
      href={props.href}
      onPress={send.beforeSelect}
      part="item"
      role="menuitem"
    >
      <View part="icon">
        <Slot name="icon" />
      </View>
      <View part="label">
        <Slot />
        <View
          ariaHidden
          hidden={!derived.showsShortcut}
          part="shortcut"
        >
          <Slot
            name="shortcut"
            platform="web"
          />
          <Text
            part="shortcut-words"
            platform="native"
          >
            {derived.shortcutWords}
          </Text>
        </View>
      </View>
    </Pressable>
  ),
})
