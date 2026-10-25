import ExpoModulesCore

/// The keys capability's native module. It hands JavaScript each key pressed on a hardware
/// keyboard, as the `press` event, and drops each key JavaScript takes. It holds the view the focus
/// capability puts focus on, through `focus` and `focused`, so the next press starts there.
///
/// **The functions run on the JavaScript thread, and a press arrives on the main thread**, which
/// waits for `claim` and `answer` before the platform acts on the key. `KeyInterceptor` holds the
/// state both threads read.
public final class HelixKeysModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HelixKeys")

    Events("press")

    OnCreate { [weak self] in
      guard let self else {
        return
      }
      KeyInterceptor.shared.attach(self) { [weak self] press in
        self?.sendEvent("press", press)
      }
    }

    OnDestroy {
      KeyInterceptor.shared.detach(self)
    }

    Function("answer") { (id: Int, taken: Bool) in
      KeyInterceptor.shared.answer(id, taken: taken)
    }

    Function("claim") { (id: Int) -> Bool in
      KeyInterceptor.shared.claim(id)
    }

    Function("focus") { (tag: Int) in
      KeyInterceptor.shared.focus(tag)
    }

    Function("focused") { () -> Int? in
      KeyInterceptor.shared.focused()
    }

    Function("unwatch") { (tag: Int) in
      KeyInterceptor.shared.unwatch(tag)
    }

    Function("watch") { (tag: Int) in
      KeyInterceptor.shared.watch(tag)
    }

    Function("watchAnywhere") { (watching: Bool) in
      KeyInterceptor.shared.watchAnywhere(watching)
    }
  }
}
