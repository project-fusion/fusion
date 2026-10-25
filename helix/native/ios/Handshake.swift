import Foundation

/// The press the main thread holds while JavaScript decides whether it takes it.
///
/// The main thread opens a press, sends it, and waits. On the JavaScript thread, `claim` says
/// JavaScript has started on the press, and `answer` says whether a listener took it. A press
/// JavaScript does not claim in time goes to the platform, and a late `claim` then answers `false`,
/// so no listener hears a key the platform has already acted on.
final class Handshake: @unchecked Sendable {
  /// How long the main thread waits for JavaScript to start on a press: about six frames at 60 Hz.
  /// JavaScript claims within a millisecond when its thread is idle, and later only while it is
  /// busy, such as with a render. To be measured on devices.
  static let claimWithin: TimeInterval = 0.1

  /// How long the main thread waits for the answer once JavaScript has claimed a press. A listener
  /// answers within a frame, and this is the backstop for one that never returns.
  static let answerWithin: TimeInterval = 0.5

  private enum Stage {
    case answered
    case claimed
    case idle
    case waiting
  }

  private let condition = NSCondition()
  private var current = 0
  private var stage = Stage.idle
  private var taken = false

  /// Opens the next press and returns its number.
  func open() -> Int {
    condition.lock()
    defer { condition.unlock() }
    current += 1
    stage = .waiting
    taken = false
    return current
  }

  /// Waits for the open press: whether a listener took it, or `nil` where JavaScript did not claim
  /// and answer it in time.
  func wait() -> Bool? {
    condition.lock()
    defer {
      stage = .idle
      condition.unlock()
    }
    let claimBy = Date(timeIntervalSinceNow: Self.claimWithin)
    while stage == .waiting, condition.wait(until: claimBy) {}
    if stage == .waiting {
      return nil
    }
    let answerBy = Date(timeIntervalSinceNow: Self.answerWithin)
    while stage == .claimed, condition.wait(until: answerBy) {}
    return stage == .answered ? taken : nil
  }

  /// Answers `true` where press `id` is still open and waiting, and marks it claimed.
  func claim(_ id: Int) -> Bool {
    condition.lock()
    defer { condition.unlock() }
    guard id == current, stage == .waiting else {
      return false
    }
    stage = .claimed
    condition.broadcast()
    return true
  }

  /// Ends the wait on press `id`, where it is claimed.
  func answer(_ id: Int, taken: Bool) {
    condition.lock()
    defer { condition.unlock() }
    guard id == current, stage == .claimed else {
      return
    }
    self.taken = taken
    stage = .answered
    condition.broadcast()
  }
}
