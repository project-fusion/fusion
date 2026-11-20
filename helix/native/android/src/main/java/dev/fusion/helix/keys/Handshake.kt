package dev.fusion.helix.keys

import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * The press the main thread holds while JavaScript decides whether it takes it.
 *
 * The main thread opens a press, sends it, and waits. On the JavaScript thread, [claim] says
 * JavaScript has started on the press, and [answer] says whether a listener took it. A press
 * JavaScript does not claim in time goes to the activity, and a late [claim] then answers `false`,
 * so no listener hears a key the activity has already acted on.
 */
internal class Handshake {
  private enum class Stage { ANSWERED, CLAIMED, IDLE, WAITING }

  private val lock = ReentrantLock()
  private val changed = lock.newCondition()
  private var current = 0
  private var stage = Stage.IDLE
  private var taken = false

  /** Opens the next press and returns its number. */
  fun open(): Int = lock.withLock {
    current += 1
    stage = Stage.WAITING
    taken = false
    current
  }

  /**
   * Waits for the open press: whether a listener took it, or `null` where JavaScript did not claim
   * and answer it in time.
   */
  fun await(): Boolean? {
    lock.withLock {
      try {
        var left = CLAIM_WITHIN_NANOS
        while (stage == Stage.WAITING && left > 0) {
          left = changed.awaitNanos(left)
        }
        if (stage == Stage.WAITING) {
          return null
        }
        left = ANSWER_WITHIN_NANOS
        while (stage == Stage.CLAIMED && left > 0) {
          left = changed.awaitNanos(left)
        }
        return if (stage == Stage.ANSWERED) taken else null
      } catch (interrupted: InterruptedException) {
        Thread.currentThread().interrupt()
        return null
      } finally {
        stage = Stage.IDLE
      }
    }
  }

  /** Answers `true` where press [id] is still open and waiting, and marks it claimed. */
  fun claim(id: Int): Boolean {
    lock.withLock {
      if (id != current || stage != Stage.WAITING) {
        return false
      }
      stage = Stage.CLAIMED
      changed.signalAll()
      return true
    }
  }

  /** Ends the wait on press [id], where it is claimed. */
  fun answer(id: Int, taken: Boolean) {
    lock.withLock {
      if (id == current && stage == Stage.CLAIMED) {
        this.taken = taken
        stage = Stage.ANSWERED
        changed.signalAll()
      }
    }
  }

  private companion object {
    /**
     * How long the main thread waits for JavaScript to start on a press: about six frames at
     * 60 Hz. JavaScript claims within a millisecond when its thread is idle, and later only while
     * it is busy, such as with a render. To be measured on devices.
     */
    val CLAIM_WITHIN_NANOS = TimeUnit.MILLISECONDS.toNanos(100)

    /**
     * How long the main thread waits for the answer once JavaScript has claimed a press. A
     * listener answers within a frame, and this is the backstop for one that never returns.
     */
    val ANSWER_WITHIN_NANOS = TimeUnit.MILLISECONDS.toNanos(500)
  }
}
