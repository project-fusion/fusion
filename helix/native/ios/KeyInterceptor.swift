import ObjectiveC
import UIKit

/// Holds each key pressed on a hardware keyboard while JavaScript decides whether it takes it, and
/// drops each key it takes.
///
/// **It sees a press in `UIApplication.sendEvent(_:)`, before any responder does.** A `UIKeyCommand`
/// is reached only after the focused view has had the press, so it cannot take a key from the part
/// with focus, as a drag that hears Escape anywhere has to. The method is swapped for one that asks
/// first, once, when the module is created.
///
/// **A press is sent only where something listens for it**: a watched tag is in the path from the
/// focused view up, or something watches anywhere. Every other press goes on at once.
///
/// **It holds the view the focus capability last put focus on**, since a plain view cannot hold the
/// platform's keyboard focus. React Native makes a view the first responder only where the app
/// turns on its `enableImperativeFocus` flag, which is off by default, and the iPad's focus system
/// takes a request to move focus only from a view that contains the focused item. A press made
/// while no first responder has the keyboard starts at the held view, until the focus system moves
/// focus to an item outside it. The focus system's ring stays on the item it had.
final class KeyInterceptor: @unchecked Sendable {
  static let shared = KeyInterceptor()

  /// Hands a press to JavaScript, as the module's `press` event.
  typealias Send = ([String: Any?]) -> Void

  private let handshake = Handshake()
  private let lock = NSLock()

  // Guarded by `lock`: the module calls them on the JavaScript thread, and a press reads them on the
  // main thread.
  private var anywhere = false
  /// The tag of the view the focus capability last put focus on, while it holds focus.
  private var held: Int?
  private var owner: ObjectIdentifier?
  private var send: Send?
  private var watched = Set<Int>()

  // The main thread's alone.
  /// The keys held down, by HID usage, so a press of one already down is a repeat.
  private var down = Set<Int>()
  /// The keys held down whose latest press was taken, so their release is dropped too.
  private var taken = Set<Int>()

  private func locked<T>(_ body: () -> T) -> T {
    lock.lock()
    defer { lock.unlock() }
    return body()
  }

  /// Sends presses through `send` on behalf of `owner`, the module instance a JavaScript runtime
  /// created, and swaps `sendEvent(_:)` and starts observing the focus system the first time.
  func attach(_ owner: AnyObject, send: @escaping Send) {
    locked {
      self.owner = ObjectIdentifier(owner)
      self.send = send
      watched = []
      anywhere = false
      held = nil
    }
    DispatchQueue.main.async {
      Self.swapSendEvent()
      Self.observeFocusSystem()
    }
  }

  /// Stops sending presses, unless a newer module instance has attached since, as one does when the
  /// JavaScript reloads.
  func detach(_ owner: AnyObject) {
    locked {
      guard self.owner == ObjectIdentifier(owner) else {
        return
      }
      self.owner = nil
      send = nil
      watched = []
      anywhere = false
      held = nil
    }
  }

  /// Holds focus on the view with `tag`, so the presses that follow start there, and has another
  /// first responder give up the keyboard, as an input does on the web when focus leaves it.
  ///
  /// **The tag is held at once, on the JavaScript thread.** Roving focus calls this while the main
  /// thread waits for the answer to a press, so the next press finds the view the press moved to.
  func focus(_ tag: Int) {
    locked { held = tag }
    DispatchQueue.main.async {
      Focused.resign(outside: tag)
    }
  }

  /// The tag of the view that holds focus, or `nil` where none does.
  func focused() -> Int? {
    locked { held }
  }

  /// Lets go of the held view where the focus system moves focus to an item outside it, as Tab does
  /// on iPad, so the presses that follow start where the platform shows focus.
  @MainActor
  fileprivate func focusMoved(to item: UIFocusItem?) {
    let path = Focused.path(from: item as? UIView)
    locked {
      if let tag = held, !path.contains(tag) {
        held = nil
      }
    }
  }

  func watch(_ tag: Int) {
    _ = locked { watched.insert(tag) }
  }

  func unwatch(_ tag: Int) {
    _ = locked { watched.remove(tag) }
  }

  func watchAnywhere(_ watching: Bool) {
    locked { anywhere = watching }
  }

  func claim(_ id: Int) -> Bool {
    handshake.claim(id)
  }

  func answer(_ id: Int, taken: Bool) {
    handshake.answer(id, taken: taken)
  }

  /// Answers `true` where `event` is to be dropped: it carries a press JavaScript took, or the
  /// release of a key whose press it took.
  @MainActor
  func intercept(_ event: UIEvent) -> Bool {
    // A hardware keyboard's event is a `UIPhysicalKeyboardEvent`, a `UIPressesEvent` whose `type` is
    // a private value and never `.presses`, as measured on the iOS 27 simulator on October 11, 2026.
    // So the cast decides.
    guard let presses = (event as? UIPressesEvent)?.allPresses else {
      return false
    }
    var drop = false
    for press in presses {
      guard let key = press.key else {
        continue
      }
      let code = key.keyCode.rawValue
      switch press.phase {
      case .began:
        let repeating = !down.insert(code).inserted
        if decide(press, key: key, repeating: repeating) {
          taken.insert(code)
          drop = true
        } else {
          taken.remove(code)
        }
      case .ended, .cancelled:
        down.remove(code)
        if taken.remove(code) != nil {
          drop = true
        }
      default:
        break
      }
    }
    return drop
  }

  /// Sends the press to JavaScript and waits for its answer, where anything listens for it.
  ///
  /// **A repeat JavaScript cannot answer in time is dropped where it took the first press**, so a
  /// held arrow does not move the platform's focus while JavaScript is busy moving its own.
  @MainActor
  private func decide(_ press: UIPress, key: UIKey, repeating: Bool) -> Bool {
    let (send, watched, anywhere, held) = locked {
      (self.send, self.watched, self.anywhere, self.held)
    }
    guard let send else {
      return false
    }
    let responder = Focused.responder()
    // A press an input method is composing with, such as Enter accepting a candidate, is its own.
    if let input = responder as? UITextInput, input.markedTextRange != nil {
      return false
    }
    let path = Focused.path(from: Focused.view(for: press, responder: responder, held: held))
    guard anywhere || path.contains(where: watched.contains) else {
      return false
    }
    let flags = key.modifierFlags
    let id = handshake.open()
    send([
      "alt": flags.contains(.alternate),
      "control": flags.contains(.control),
      "id": id,
      "key": KeyNames.name(of: key),
      "meta": flags.contains(.command),
      "path": path,
      "repeat": repeating,
      "shift": flags.contains(.shift),
    ])
    if let answer = handshake.wait() {
      return answer
    }
    return repeating && taken.contains(key.keyCode.rawValue)
  }

  @MainActor private static var swapped = false

  /// Swaps `UIApplication.sendEvent(_:)` for `helixKeysSendEvent(_:)`, once.
  @MainActor
  private static func swapSendEvent() {
    guard !swapped else {
      return
    }
    swapped = true
    guard
      let original = class_getInstanceMethod(
        UIApplication.self, #selector(UIApplication.sendEvent(_:))),
      let replacement = class_getInstanceMethod(
        UIApplication.self, #selector(UIApplication.helixKeysSendEvent(_:)))
    else {
      return
    }
    method_exchangeImplementations(original, replacement)
  }

  @MainActor private static var observing = false

  /// Observes each focus update the focus system makes, once, so a move away from the held view
  /// lets go of it.
  @MainActor
  private static func observeFocusSystem() {
    guard !observing else {
      return
    }
    observing = true
    NotificationCenter.default.addObserver(
      forName: UIFocusSystem.didUpdateNotification, object: nil, queue: .main
    ) { notification in
      let key = UIFocusSystem.focusUpdateContextUserInfoKey
      MainActor.assumeIsolated {
        let context = notification.userInfo?[key] as? UIFocusUpdateContext
        shared.focusMoved(to: context?.nextFocusedItem)
      }
    }
  }
}

extension UIApplication {
  /// Takes the place of `sendEvent(_:)` once swapped: the keys capability sees each event first,
  /// and what it does not drop goes on to the original, which this name calls after the swap.
  @objc func helixKeysSendEvent(_ event: UIEvent) {
    if KeyInterceptor.shared.intercept(event) {
      return
    }
    helixKeysSendEvent(event)
  }
}

/// Which view has focus, as a press finds it.
@MainActor
enum Focused {
  private static weak var reported: UIResponder?

  /// The first responder, found by sending an action to it.
  static func responder() -> UIResponder? {
    reported = nil
    UIApplication.shared.sendAction(
      #selector(UIResponder.helixKeysReportFirstResponder(_:)), to: nil, from: nil, for: nil)
    return reported
  }

  static func report(_ responder: UIResponder) {
    reported = responder
  }

  /// The view with focus: the first responder, then the view with the `held` tag, then the focus
  /// system's focused item, then the press's own responder, which is the root view where nothing
  /// has focus.
  static func view(for press: UIPress, responder: UIResponder?, held: Int?) -> UIView? {
    if let view = responder as? UIView, !(view is UIWindow) {
      return view
    }
    let window = (press.responder as? UIView)?.window ?? keyWindow()
    if let held, let view = window?.viewWithTag(held) {
      return view
    }
    if let window, let item = UIFocusSystem.focusSystem(for: window)?.focusedItem as? UIView {
      return item
    }
    if let view = press.responder as? UIView, !(view is UIWindow) {
      return view
    }
    return nil
  }

  /// Has the first responder give up the keyboard, unless it belongs to the view with `tag`: the
  /// view itself, or a view without a tag inside it, as a text input's own text field is.
  static func resign(outside tag: Int) {
    guard let view = responder() as? UIView, !(view is UIWindow), path(from: view).first != tag
    else {
      return
    }
    view.resignFirstResponder()
  }

  /// The tag of `view` and of each view it is inside, nearest first, leaving out the views without
  /// one. React Native sets a view's tag to its React tag.
  static func path(from view: UIView?) -> [Int] {
    var tags: [Int] = []
    var each = view
    while let one = each {
      if one.tag != 0 {
        tags.append(one.tag)
      }
      each = one.superview
    }
    return tags
  }

  private static func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)
  }
}

extension UIResponder {
  @objc func helixKeysReportFirstResponder(_ sender: Any?) {
    Focused.report(self)
  }
}
