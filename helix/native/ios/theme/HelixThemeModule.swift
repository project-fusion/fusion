import ExpoModulesCore

/// The theme engine's native module. `deriveModes` derives an intent's colors in light and dark
/// mode with `fusion-helix-theme`, the engine the web runs as WebAssembly, so a phone and a browser
/// derive the same colors from the same seeds.
///
/// **`deriveModes` is defined only where the engine was built into the pod**, as
/// `theme/engine/HelixThemeFFI.xcframework`. Without it the module has no functions, and
/// JavaScript draws the colors derived at build time.
///
/// **The function runs on the JavaScript thread and returns at once.** One intent takes a few
/// milliseconds in each mode, and the theme asks once for each intent it is given.
public final class HelixThemeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HelixTheme")

    #if canImport(HelixThemeFFI)
      Function("deriveModes") { (intent: String) throws -> [String: Any] in
        do {
          let modes = try deriveModes(intent: intent)
          return ["dark": described(modes.dark), "light": described(modes.light)]
        } catch let Refusal.Intent(reason) {
          throw Exception(name: "ThemeRefused", description: reason)
        }
      }
    #endif
  }
}

#if canImport(HelixThemeFFI)
  /// One mode as JavaScript reads it: the shape of the crate's `DerivedMode`.
  private func described(_ mode: DerivedMode) -> [String: Any] {
    [
      "colors": mode.colors.map { ["hex": $0.hex, "name": $0.name] },
      "violations": mode.violations,
    ]
  }
#endif
