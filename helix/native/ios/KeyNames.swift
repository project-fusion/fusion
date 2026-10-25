import UIKit

/// Names a key as the web's `KeyboardEvent.key` names it.
enum KeyNames {
  /// The keys the web names with a word, such as `ArrowDown`, by their HID usage.
  private static let named: [UIKeyboardHIDUsage: String] = {
    var named: [UIKeyboardHIDUsage: String] = [
      .keyboardApplication: "ContextMenu",
      .keyboardCapsLock: "CapsLock",
      .keyboardDeleteForward: "Delete",
      .keyboardDeleteOrBackspace: "Backspace",
      .keyboardDownArrow: "ArrowDown",
      .keyboardEnd: "End",
      .keyboardEscape: "Escape",
      .keyboardHome: "Home",
      .keyboardInsert: "Insert",
      .keyboardLeftAlt: "Alt",
      .keyboardLeftArrow: "ArrowLeft",
      .keyboardLeftControl: "Control",
      .keyboardLeftGUI: "Meta",
      .keyboardLeftShift: "Shift",
      .keyboardPageDown: "PageDown",
      .keyboardPageUp: "PageUp",
      .keyboardReturn: "Enter",
      .keyboardReturnOrEnter: "Enter",
      .keyboardRightAlt: "Alt",
      .keyboardRightArrow: "ArrowRight",
      .keyboardRightControl: "Control",
      .keyboardRightGUI: "Meta",
      .keyboardRightShift: "Shift",
      .keyboardSpacebar: " ",
      .keyboardTab: "Tab",
      .keyboardUpArrow: "ArrowUp",
      .keypadEnter: "Enter",
    ]
    // F1 to F12 are consecutive usages.
    for number in 1...12 {
      if let usage = UIKeyboardHIDUsage(rawValue: UIKeyboardHIDUsage.keyboardF1.rawValue + number - 1) {
        named[usage] = "F\(number)"
      }
    }
    return named
  }()

  /// The key's value: its word where the web has one, and otherwise the character it types.
  static func name(of key: UIKey) -> String {
    if let word = named[key.keyCode] {
      return word
    }
    // Control and a letter type a control character, where the web names the letter.
    return printable(key.characters) ?? printable(key.charactersIgnoringModifiers) ?? "Unidentified"
  }

  /// `characters`, where it is something a key types. UIKit names the keys it has no character for
  /// with a `UIKeyInput` constant, such as `UIKeyInputPageUp`, and those are not typed.
  private static func printable(_ characters: String) -> String? {
    guard let first = characters.unicodeScalars.first,
      !CharacterSet.controlCharacters.contains(first),
      !characters.hasPrefix("UIKeyInput")
    else {
      return nil
    }
    return characters
  }
}
