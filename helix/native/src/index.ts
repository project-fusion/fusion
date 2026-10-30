/**
 * Helix on React Native: the runtime that draws each component from its
 * intermediate form, the theme it draws with, and the root an app wraps itself
 * in.
 *
 * **The peers are checked first.** `./peers` is imported before any module that
 * needs one, so where a runtime loads each module as it runs it, as Jest does,
 * an app missing React Native, Gesture Handler, Reanimated, or worklets is told
 * every one of them in one error. Metro stops the bundle at the first.
 *
 * The components themselves ship from `@fusion.dev/helix`, as
 * `@fusion.dev/helix/tabs` resolves under the `react-native` condition. They
 * are drawn with `element` and `behaviorFor`, which this exports for them.
 */
import './peers'

export { type DateTimeSupport, dateTimeSupport } from './capabilities/intl'
export { useLocale } from './capabilities/locale'
export { type NumberSupport, numberSupport } from './capabilities/number-format'
export type {
  ComponentProps,
  ElementEvent,
  FieldHandleContract,
  LayerHostProps,
  NativeRuntime,
  PlatformElementEvent,
  TokenValues,
  UseBehavior,
} from './contract'
export { useCountdown, useDelay, useWallClock } from './machines/clocks'
export { behaviorFor } from './machines/compose'
export { claimLongPress, type HoldRank } from './machines/long-press'
export type { HelixEvent, PlatformEvent } from './machines/props'
export type { FileStatus, FilesHandle } from './machines/files'
export type { FieldHandle } from './machines/validation'
export { useInheritedText } from './render/around'
export { Density, type DensityStop, densityOf } from './render/density'
export { element } from './render/element'
export { useOpenPhase } from './render/fit'
export { hookPrefix, regionNames } from './render/made'
export { motionPaused, onMotionChange, pauseMotion, useMotionPaused } from './render/motion'
export type { OpenPhase } from './render/opening'
export { ScrollArea } from './render/scroll'
export { type SectionAbout, scrollToSection, useSection } from './render/sections'
export { sharedCodeWarnings, warnWebTag } from './render/shared-code'
export { useSlottedBox } from './render/slotted-box'
export { useTarget } from './render/targets'
export { useWrapWidth } from './render/text'
export {
  type ToolbarAxis,
  ToolbarAxisContext,
  type ToolbarStop,
  type ToolbarStops,
  ToolbarStopsContext,
  useToolbarAxis,
  useToolbarStops,
} from './render/toolbar'
export { glyphs, type Icon } from './render/vector'
export { webOnly } from './render/web-only'
export type { KeyboardHandling } from './root/layers'
export { HelixRoot, type HelixRootProps, useInsideHelixRoot } from './root/root'
export type { Family } from './style/form'
export { SPACE_SCALE_LIMIT, type Tokens } from './theme/drawn'
export type { ThemeSeeds } from './theme/engine'
export {
  HelixTheme,
  type HelixThemeProps,
  type Mode,
  type ModeTokens,
  useFontScale,
  useTokens,
} from './theme/helix-theme'
export type { GlyphProps } from './theme/theme'
