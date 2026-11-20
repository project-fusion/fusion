package dev.fusion.helix.theme

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The theme engine's native module. `deriveModes` derives an intent's colors in light and dark
 * mode with `fusion-helix-theme`, the engine the web runs as WebAssembly, so a phone and a browser
 * derive the same colors from the same seeds.
 *
 * **`deriveModes` is defined only where the engine was built into the package**, under
 * `src/engine`, and `build.gradle` then compiles `src/withEngine` beside this file, where it
 * compiles `src/withoutEngine` otherwise. Without the engine the module has no functions, and
 * JavaScript draws the colors derived at build time.
 *
 * **The function runs on the JavaScript thread and returns at once.** One intent takes a few
 * milliseconds in each mode, and the theme asks once for each intent it is given.
 */
class HelixThemeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HelixTheme")

    deriving()
  }
}
