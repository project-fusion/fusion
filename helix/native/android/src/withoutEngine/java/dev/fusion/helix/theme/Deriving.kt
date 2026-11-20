package dev.fusion.helix.theme

import expo.modules.kotlin.modules.ModuleDefinitionBuilder

/** Defines nothing: this build has no engine, so the theme draws the colors derived at build time. */
internal fun ModuleDefinitionBuilder.deriving() = Unit
