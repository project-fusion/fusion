package dev.fusion.helix.theme

import dev.fusion.helix.theme.engine.DerivedMode
import dev.fusion.helix.theme.engine.Refusal
import dev.fusion.helix.theme.engine.deriveModes
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.ModuleDefinitionBuilder

/** The engine refused an intent, for `reason`, which names the field it is about. */
internal class ThemeRefusedException(reason: String) : CodedException(reason)

/** Defines `deriveModes` over the engine `src/engine` holds. */
internal fun ModuleDefinitionBuilder.deriving() {
  Function("deriveModes") { intent: String ->
    val modes =
      try {
        deriveModes(intent)
      } catch (refused: Refusal.Intent) {
        throw ThemeRefusedException(refused.reason)
      }
    mapOf("dark" to described(modes.dark), "light" to described(modes.light))
  }
}

/** One mode as JavaScript reads it: the shape of the crate's `DerivedMode`. */
private fun described(mode: DerivedMode): Map<String, Any> =
  mapOf(
    "colors" to mode.colors.map { mapOf("hex" to it.hex, "name" to it.name) },
    "violations" to mode.violations,
  )
