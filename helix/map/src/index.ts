export type {
  ConnectOptions,
  MapBounds,
  MapConnection,
  MapDriver,
  MapInView,
  MapLayerEvents,
  MapLayerSpec,
  MapPadding,
  MapPlace,
  MapType,
} from './connect-map/index.js'
export { connectMap, distancesAlong } from './connect-map/index.js'
export type { CreditPart } from './credit/index.js'
export { creditParts } from './credit/index.js'
export type { MapMotion, MapPace } from './motion/index.js'
export { easingOf, millisecondsOf, motionOf } from './motion/index.js'
export type { MapPoints } from './points/index.js'
export { pointsFrom } from './points/index.js'
export type { MapColors } from './style/index.js'
export {
  colorsNow,
  colorsReady,
  fontReady,
  mapColorsFrom,
  mapFontFrom,
  PATIENCE,
  settledColor,
} from './style/index.js'
export { watchTheme } from './theme/index.js'
