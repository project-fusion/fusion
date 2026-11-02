package dev.fusion.helix.keys

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The keys capability's native module. It hands JavaScript each key pressed on a hardware
 * keyboard, as the `press` event, and drops each key JavaScript takes. It holds the view the focus
 * capability puts focus on, through `focus` and `focused`, so the next press starts there.
 *
 * **The functions run on the JavaScript thread, and a press arrives on the main thread**, which
 * waits for `claim` and `answer` before the activity acts on the key. [KeyInterceptor] holds the
 * state both threads read.
 */
class HelixKeysModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HelixKeys")

    Events("press")

    OnCreate {
      KeyInterceptor.attach(this@HelixKeysModule) { press -> sendEvent("press", press) }
      wrapWindow()
    }

    // A new activity, as one made again after a rotation, has a window of its own.
    OnActivityEntersForeground {
      wrapWindow()
    }

    OnDestroy {
      KeyInterceptor.detach(this@HelixKeysModule)
    }

    Function("answer") { id: Int, taken: Boolean ->
      KeyInterceptor.answer(id, taken)
    }

    Function("claim") { id: Int ->
      KeyInterceptor.claim(id)
    }

    Function("focus") { tag: Int ->
      KeyInterceptor.focus(tag)
      appContext.currentActivity?.let { activity ->
        activity.runOnUiThread { KeyInterceptor.request(activity.window, tag) }
      }
    }

    Function("focused") { ->
      KeyInterceptor.focused()
    }

    Function("unwatch") { tag: Int ->
      KeyInterceptor.unwatch(tag)
    }

    Function("watch") { tag: Int ->
      KeyInterceptor.watch(tag)
    }

    Function("watchAnywhere") { watching: Boolean ->
      KeyInterceptor.watchAnywhere(watching)
    }
  }

  /** Puts the keys capability in front of the current activity's window, on the main thread. */
  private fun wrapWindow() {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread { KeysWindowCallback.wrap(activity.window) }
  }
}
