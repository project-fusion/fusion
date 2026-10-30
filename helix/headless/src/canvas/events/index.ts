/*
 * The canvas events: one class each, typed on `addEventListener` for the
 * canvas element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeMoveEvent } from './before-move.js'
import { HelixBeforePasteEvent } from './before-paste.js'
import { HelixBeforeReconnectEvent } from './before-reconnect.js'
import { HelixBeforeRelabelEvent } from './before-relabel.js'
import { HelixCanvasEditEvent } from './canvas-edit.js'
import { HelixCanvasPanEvent } from './canvas-pan.js'
import { HelixCanvasViewEvent } from './canvas-view.js'
import { HelixCanvasZoomEvent } from './canvas-zoom.js'
import { HelixConnectEvent } from './connect.js'
import { HelixMoveEvent } from './move.js'
import { HelixPastedEvent } from './pasted.js'
import { HelixReconnectEvent } from './reconnect.js'
import { HelixRelabelEvent } from './relabel.js'
import { HelixRemoveEvent } from './remove.js'

export type {
  CanvasView,
  ConnectDetail,
  MoveDetail,
  PasteDetail,
  ReconnectDetail,
  RelabelDetail,
  RemoveDetail,
} from './details.js'
export {
  HelixBeforeMoveEvent,
  HelixBeforePasteEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixConnectEvent,
  HelixMoveEvent,
  HelixPastedEvent,
  HelixReconnectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
}

const registry = {
  HelixBeforeMoveEvent,
  HelixBeforePasteEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixConnectEvent,
  HelixMoveEvent,
  HelixPastedEvent,
  HelixReconnectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
} as const

type Registry = typeof registry

type CanvasEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends CanvasEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
