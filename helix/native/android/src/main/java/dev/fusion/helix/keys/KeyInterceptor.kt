package dev.fusion.helix.keys

import android.view.KeyEvent
import android.view.View
import android.view.Window
import android.widget.EditText

/**
 * Holds each key pressed on a hardware keyboard while JavaScript decides whether it takes it, and
 * drops each key it takes.
 *
 * **A press is sent only where something listens for it**: a watched tag is in the path from the
 * focused view up, or something watches anywhere. Every other key goes on at once, as do the
 * system's keys, such as Back and the volume keys, and a key an input method has already handled.
 *
 * **It holds the view the focus capability last put focus on**, since React Native moves the
 * system's focus to a view only where the app turns on its `enableImperativeFocus` flag, which is
 * off by default. A Pressable can take the system's focus, since React Native makes one focusable
 * on Android, so the view is asked for it as well. A press made while no text input has focus
 * starts at the held view, until the system's focus moves to a view outside it.
 */
internal object KeyInterceptor {
  private val handshake = Handshake()
  private val lock = Any()

  // Guarded by `lock`: the module calls them on the JavaScript thread, and a press reads them on
  // the main thread.
  private var anywhere = false

  /** The tag of the view the focus capability last put focus on, while it holds focus. */
  private var held: Int? = null
  private var owner: Any? = null
  private var send: ((Map<String, Any?>) -> Unit)? = null
  private val watched = HashSet<Int>()

  /** The keys held down whose latest press was taken, so their release is dropped too. The main thread's alone. */
  private val taken = HashSet<Int>()

  /** Sends presses through [send] on behalf of [owner], the module instance a JavaScript runtime created. */
  fun attach(owner: Any, send: (Map<String, Any?>) -> Unit) = synchronized(lock) {
    this.owner = owner
    this.send = send
    watched.clear()
    anywhere = false
    held = null
  }

  /** Stops sending presses, unless a newer module instance has attached since, as one does when the JavaScript reloads. */
  fun detach(owner: Any) = synchronized(lock) {
    if (this.owner === owner) {
      this.owner = null
      send = null
      watched.clear()
      anywhere = false
      held = null
    }
  }

  fun watch(tag: Int) {
    synchronized(lock) { watched.add(tag) }
  }

  fun unwatch(tag: Int) {
    synchronized(lock) { watched.remove(tag) }
  }

  fun watchAnywhere(watching: Boolean) {
    synchronized(lock) { anywhere = watching }
  }

  /**
   * Holds focus on the view with [tag], so the presses that follow start there.
   *
   * **Held at once, on the JavaScript thread.** Roving focus calls this while the main thread waits
   * for the answer to a press, so the next press finds the view the press moved to.
   */
  fun focus(tag: Int) {
    synchronized(lock) { held = tag }
  }

  /** The tag of the view that holds focus, or `null` where none does. */
  fun focused(): Int? = synchronized(lock) { held }

  /**
   * Asks the view with [tag] in [window] for the system's focus, on the main thread, where it is
   * still the one held and can take focus. A text input that had focus loses it.
   */
  fun request(window: Window, tag: Int) {
    if (synchronized(lock) { held } != tag) {
      return
    }
    val view = window.decorView.findViewById<View>(tag) ?: return
    if (view.isFocusable && !view.isFocused) {
      view.requestFocus()
    }
  }

  /**
   * Lets go of the held view where the system's focus moves to [next], a view outside it, as Tab
   * does, so the presses that follow start where the system shows focus.
   */
  fun focusMoved(next: View?) {
    if (next == null) {
      return
    }
    val path = pathFrom(next)
    synchronized(lock) {
      if (held?.let { it !in path } == true) {
        held = null
      }
    }
  }

  fun claim(id: Int): Boolean = handshake.claim(id)

  fun answer(id: Int, taken: Boolean) = handshake.answer(id, taken)

  /** Answers `true` where [event] is to be dropped: a press JavaScript took, or the release of a key whose press it took. */
  fun intercept(event: KeyEvent, window: Window): Boolean {
    if (event.isSystem) {
      return false
    }
    val code = event.keyCode
    return when (event.action) {
      KeyEvent.ACTION_DOWN -> {
        val took = decide(event, window)
        if (took) taken.add(code) else taken.remove(code)
        took
      }
      KeyEvent.ACTION_UP -> taken.remove(code)
      else -> false
    }
  }

  /**
   * Sends the press to JavaScript and waits for its answer, where anything listens for it.
   *
   * **A repeat JavaScript cannot answer in time is dropped where it took the first press**, so a
   * held arrow does not move the system's focus while JavaScript is busy moving its own.
   */
  private fun decide(event: KeyEvent, window: Window): Boolean {
    val (sender, watching, everywhere) = synchronized(lock) { Triple(send, watched.toSet(), anywhere) }
    if (sender == null) {
      return false
    }
    val path = pathFrom(focusedView(window))
    if (!everywhere && path.none { it in watching }) {
      return false
    }
    val repeating = event.repeatCount > 0
    val id = handshake.open()
    sender(
      mapOf(
        "alt" to event.isAltPressed,
        "control" to event.isCtrlPressed,
        "id" to id,
        "key" to KeyNames.nameOf(event),
        "meta" to event.isMetaPressed,
        "path" to path,
        "repeat" to repeating,
        "shift" to event.isShiftPressed,
      ),
    )
    return handshake.await() ?: (repeating && event.keyCode in taken)
  }

  /** The view with focus: a text input with focus, then the held view, then the view with the system's focus. */
  private fun focusedView(window: Window): View? {
    val current = window.currentFocus
    if (current is EditText) {
      return current
    }
    val tag = synchronized(lock) { held } ?: return current
    return window.decorView.findViewById(tag) ?: current
  }

  /** The id of [view] and of each view it is inside, nearest first. React Native sets a view's id to its React tag. */
  private fun pathFrom(view: View?): List<Int> {
    val tags = ArrayList<Int>()
    var each = view
    while (each != null) {
      if (each.id != View.NO_ID) {
        tags.add(each.id)
      }
      each = each.parent as? View
    }
    return tags
  }
}
