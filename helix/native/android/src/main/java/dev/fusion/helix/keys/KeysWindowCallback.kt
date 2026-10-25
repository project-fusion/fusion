package dev.fusion.helix.keys

import android.os.Build
import android.view.KeyEvent
import android.view.KeyboardShortcutGroup
import android.view.Menu
import android.view.Window

/**
 * Stands in front of an activity's window callback, so the keys capability sees each key event
 * before the focused view, the activity, and the system's focus navigation do.
 *
 * **The window callback is where `Activity.dispatchKeyEvent` is called from**, so wrapping it
 * reaches that point without a change to the app's `MainActivity` and without a config plugin.
 * Every other call goes to the callback it wraps.
 */
internal class KeysWindowCallback private constructor(
  private val window: Window,
  private val wrapped: Window.Callback,
) : Window.Callback by wrapped {
  override fun dispatchKeyEvent(event: KeyEvent): Boolean =
    KeyInterceptor.intercept(event, window) || wrapped.dispatchKeyEvent(event)

  // The two calls the interface gives a default body, which delegation by `by` may leave out.
  override fun onProvideKeyboardShortcuts(
    data: MutableList<KeyboardShortcutGroup>?,
    menu: Menu?,
    deviceId: Int,
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      wrapped.onProvideKeyboardShortcuts(data, menu, deviceId)
    }
  }

  override fun onPointerCaptureChanged(hasCapture: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      wrapped.onPointerCaptureChanged(hasCapture)
    }
  }

  companion object {
    /**
     * Wraps the callback of [window], once, and tells [KeyInterceptor] each move of the window's
     * focus. Both stay when the module goes, as on a reload, since [KeyInterceptor] passes every key
     * on while no module is attached.
     */
    fun wrap(window: Window) {
      val current = window.callback ?: return
      if (current is KeysWindowCallback) {
        return
      }
      window.callback = KeysWindowCallback(window, current)
      window.decorView.viewTreeObserver.addOnGlobalFocusChangeListener { _, next ->
        KeyInterceptor.focusMoved(next)
      }
    }
  }
}
