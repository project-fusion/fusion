export type {
  ConnectOptions,
  MapBounds,
  MapConnection,
  MapDriver,
  MapLayerSpec,
  MapPadding,
  MapPlace,
} from './connect-map/index.js'
export { connectMap } from './connect-map/index.js'
export type { CreditPart } from './credit/index.js'
export { creditParts } from './credit/index.js'
export type { MapMotion, MapPace } from './motion/index.js'
export { easingOf, millisecondsOf, motionOf } from './motion/index.js'
export type { MapColors } from './style/index.js'
export { colorsNow, colorsReady, mapColorsFrom, PATIENCE, settledColor } from './style/index.js'
export { watchTheme } from './theme/index.js'
