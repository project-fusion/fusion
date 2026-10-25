import type { Focus } from '@fusion.dev/helix-core/capabilities/focus'
import { AccessibilityInfo, type HostInstance, TextInput } from 'react-native'
import { focusMoved } from './focus-visible'
import { type KeysModule, keysModule, tagOf } from './keys'

/** What the focus capability uses of the keys module: holding focus on a view, and reading it back. */
export type FocusHolder = Pick<KeysModule, 'focus' | 'focused'>

/**
 * The focus capability over `module`, the keys module that holds focus where
 * the platform cannot.
 *
 * **`focus` moves keyboard focus with the host instance's `focus()`, and the
 * module holds it on the node's view.** React Native's `focus()` reaches a
 * text input, and a view only where the app turns on React Native's
 * `enableImperativeFocus` flag, which is off by default, on iOS and Android
 * alike. The module holds the view, so the next key pressed starts there, as
 * the keys capability hears it, and a text input that had the keyboard gives
 * it up. On Android the module also asks the view for the system's focus,
 * which a Pressable can take. The screen reader's focus moves either way, with
 * `AccessibilityInfo.sendAccessibilityEvent(node, 'focus')`.
 *
 * **`preventScroll` is not passed on**, because `focus()` takes no options.
 *
 * **`focused` answers what the keys capability starts a press from**: the
 * text input with the keyboard, then the node focus last moved to while the
 * module holds its view, then `null`. An item the iPad's focus system moved
 * focus to reads as `null`, since nothing maps its view back to a node, and a
 * screen reader's focus cannot be read back, so a host restoring focus does
 * its best with what it saved.
 */
export const focusThrough = (
  module: FocusHolder | null,
  tagFor: (node: HostInstance) => number | null = tagOf,
): Focus<HostInstance> => {
  let last: HostInstance | null = null
  return {
    focus: (node) => {
      node.focus()
      AccessibilityInfo.sendAccessibilityEvent(node, 'focus')
      const tag = tagFor(node)
      if (module?.focus === undefined || tag === null) {
        return
      }
      module.focus(tag)
      last = node
      focusMoved()
      /* The module resigns the input's view on the main thread. Blurring it
         here updates React Native's record at once, so `focused` reads the
         node now. */
      const input = TextInput.State.currentlyFocusedInput()
      if (input != null && input !== node) {
        TextInput.State.blurTextInput(input)
      }
    },
    focused: () => {
      const input = TextInput.State.currentlyFocusedInput()
      if (input != null) {
        return input
      }
      if (last === null || module?.focused === undefined || !last.isConnected) {
        return null
      }
      return module.focused() === tagFor(last) ? last : null
    },
  }
}

/** The focus capability over the native module, built at the first call. */
let loaded: Focus<HostInstance> | undefined

const load = (): Focus<HostInstance> => {
  loaded ??= focusThrough(keysModule())
  return loaded
}

/**
 * Moves keyboard focus and a screen reader's focus to a node, and reads
 * keyboard focus back, through the keys module this package ships.
 *
 * **Where the module is missing, as in Expo Go, keyboard focus reaches only a
 * text input**, unless the app turns on React Native's `enableImperativeFocus`
 * flag, and `focused` answers the text input with the keyboard.
 */
export const nativeFocus: Focus<HostInstance> = {
  focus: (node, preventScroll) => load().focus(node, preventScroll),
  focused: () => load().focused(),
}
