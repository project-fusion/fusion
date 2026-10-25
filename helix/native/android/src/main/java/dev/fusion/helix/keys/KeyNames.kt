package dev.fusion.helix.keys

import android.view.KeyCharacterMap
import android.view.KeyEvent

/** Names a key as the web's `KeyboardEvent.key` names it. */
internal object KeyNames {
  /** The keys the web names with a word, such as `ArrowDown`, by their key code. */
  private val named: Map<Int, String> = buildMap {
    put(KeyEvent.KEYCODE_ALT_LEFT, "Alt")
    put(KeyEvent.KEYCODE_ALT_RIGHT, "Alt")
    put(KeyEvent.KEYCODE_BREAK, "Pause")
    put(KeyEvent.KEYCODE_CAPS_LOCK, "CapsLock")
    put(KeyEvent.KEYCODE_CTRL_LEFT, "Control")
    put(KeyEvent.KEYCODE_CTRL_RIGHT, "Control")
    put(KeyEvent.KEYCODE_DEL, "Backspace")
    put(KeyEvent.KEYCODE_DPAD_CENTER, "Enter")
    put(KeyEvent.KEYCODE_DPAD_DOWN, "ArrowDown")
    put(KeyEvent.KEYCODE_DPAD_LEFT, "ArrowLeft")
    put(KeyEvent.KEYCODE_DPAD_RIGHT, "ArrowRight")
    put(KeyEvent.KEYCODE_DPAD_UP, "ArrowUp")
    put(KeyEvent.KEYCODE_ENTER, "Enter")
    put(KeyEvent.KEYCODE_ESCAPE, "Escape")
    put(KeyEvent.KEYCODE_FORWARD_DEL, "Delete")
    put(KeyEvent.KEYCODE_INSERT, "Insert")
    put(KeyEvent.KEYCODE_META_LEFT, "Meta")
    put(KeyEvent.KEYCODE_META_RIGHT, "Meta")
    put(KeyEvent.KEYCODE_MOVE_END, "End")
    put(KeyEvent.KEYCODE_MOVE_HOME, "Home")
    put(KeyEvent.KEYCODE_NUM_LOCK, "NumLock")
    put(KeyEvent.KEYCODE_NUMPAD_ENTER, "Enter")
    put(KeyEvent.KEYCODE_PAGE_DOWN, "PageDown")
    put(KeyEvent.KEYCODE_PAGE_UP, "PageUp")
    put(KeyEvent.KEYCODE_SCROLL_LOCK, "ScrollLock")
    put(KeyEvent.KEYCODE_SHIFT_LEFT, "Shift")
    put(KeyEvent.KEYCODE_SHIFT_RIGHT, "Shift")
    put(KeyEvent.KEYCODE_SPACE, " ")
    put(KeyEvent.KEYCODE_SYSRQ, "PrintScreen")
    put(KeyEvent.KEYCODE_TAB, "Tab")
    // F1 to F12 are consecutive key codes.
    for (number in 1..12) {
      put(KeyEvent.KEYCODE_F1 + number - 1, "F$number")
    }
  }

  /** The modifiers that make no character, which the web leaves out of a key's name. */
  private const val TYPING_NOTHING = KeyEvent.META_CTRL_MASK or KeyEvent.META_META_MASK

  /** The key's value: its word where the web has one, and otherwise the character it types. */
  fun nameOf(event: KeyEvent): String {
    named[event.keyCode]?.let { return it }
    // Control and a letter type nothing, where the web names the letter.
    val typed = event.unicodeChar.takeIf { it != 0 }
      ?: event.getUnicodeChar(event.metaState and TYPING_NOTHING.inv())
    return when {
      typed == 0 -> "Unidentified"
      typed and KeyCharacterMap.COMBINING_ACCENT != 0 -> "Dead"
      Character.isISOControl(typed) -> "Unidentified"
      else -> String(Character.toChars(typed))
    }
  }
}
