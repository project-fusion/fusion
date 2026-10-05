/**
 * Event classes, one per event a Helix component dispatches.
 *
 * A named class rather than `dispatchEvent(new CustomEvent(name, …))` for three
 * reasons, all of them about the type reaching a consumer:
 *
 * 1. `@event {HelixBeforeOpenEvent} helix-before-open` puts the class name in the manifest,
 *    which is what lets the React generator emit a typed callback instead of
 *    `(detail: unknown)`.
 * 2. The augmentation of `HTMLElementEventMap` below types `addEventListener`
 *    for consumers writing plain HTML, who never see the React wrappers.
 * 3. The event name lives on the class as `eventName`, so a listener and a
 *    dispatch cannot disagree about the string.
 *
 * **One module per class, and this file gathers them.** Each class is in a
 * file of its own beside this one, named after its event (`before-open.ts`
 * holds `HelixBeforeOpenEvent`), and declares its name as `static readonly
 * eventName`, which is how `helix component audit` finds them. What they carry
 * is in `details.ts`, types only. This file re-exports both, keeps the
 * registry, and types `addEventListener`.
 *
 * **Apart because a bundle keeps a class it never uses.** The compiler writes
 * `static readonly eventName` as a static block, and Bun and Rollup both treat
 * one as a side effect, so a class in a shared module stayed in every bundle
 * that imported anything from that module. With the eighty classes in one
 * file, every element shipped all of them, a Badge too. A module whose exports
 * nothing uses is dropped whole, since the package declares no side effects,
 * so a family now ships the classes it dispatches and no others.
 * `events.pure.spec.ts` holds every file to one class.
 */

/*
 * Names are `helix-{verb}`, lowercase and prefixed.
 *
 * The prefix is what stops a collision with a native name: an event dispatched
 * inside a shadow root is retargeted to look like it came from the host, so a
 * bare `input` from a `<helix-input>` is indistinguishable from the inner
 * control's own. Prefixed, it cannot be mistaken for either.
 *
 * The name also decides the framework prop, and decides it verbatim: React
 * slices `on` off the prop and listens for exactly what is left, so `helix-before-open`
 * is `onhelix-before-open`. Nothing strips the prefix and nothing camel-cases it, which
 * is what leaves the prefix free to do the third job below.
 *
 * The prefix earns its place three times over:
 *
 * 1. **Retargeting.** Stated above, and the reason it exists.
 * 2. **React's claimed verbs.** Its synthetic system owns `change`, `input`,
 *    `submit`, `copy`, `focus` and the rest, and a prop matching one of those
 *    is wired to the native event. Prefixed, `onhelix-before-change` matches none
 *    of them and reaches us.
 * 3. **The type map below, which is global.** `HTMLElementEventMap` is shared
 *    with every element in a consumer's application, and our classes extend
 *    `Event`, so an entry named `select` does not fail to compile: it silently
 *    retypes `textarea.addEventListener('select', …)` as carrying our detail,
 *    which at runtime is `undefined`. Measured. An unprefixed name is not a
 *    collision we would notice, it is one a consumer would.
 *
 * Propagation follows the event's role rather than a single house rule:
 *
 * - **Lifecycle** (`helix-before-open`, `helix-before-close`) does not bubble and is not
 *   composed. Overlays nest, and an inner one's lifecycle must never reach the
 *   outer one that contains it.
 * - **Coordination** (`helix-select`, `helix-dismiss`, `helix-before-change`)
 *   bubbles and is composed, so a parent or a router can intercept it across a
 *   shadow boundary.
 */

import { HelixActionEvent } from './action.js'
import { HelixActivateEvent } from './activate.js'
import { HelixAuraFallbackEvent } from './aura-fallback.js'
import { HelixBeforeActivateEvent } from './before-activate.js'
import { HelixBeforeChangeEvent } from './before-change.js'
import { HelixBeforeCloseEvent } from './before-close.js'
import { HelixBeforeCollapseEvent } from './before-collapse.js'
import { HelixBeforeEditEvent } from './before-edit.js'
import { HelixBeforeMoveEvent } from './before-move.js'
import { HelixBeforeOpenEvent } from './before-open.js'
import { HelixBeforePanelResizeEvent } from './before-panel-resize.js'
import { HelixBeforePinEvent } from './before-pin.js'
import { HelixBeforeReconnectEvent } from './before-reconnect.js'
import { HelixBeforeRelabelEvent } from './before-relabel.js'
import { HelixBeforeResizeEvent } from './before-resize.js'
import { HelixBeforeSplitEvent } from './before-split.js'
import { HelixBeforeToggleEvent } from './before-toggle.js'
import { HelixCanvasEditEvent } from './canvas-edit.js'
import { HelixCanvasPanEvent } from './canvas-pan.js'
import { HelixCanvasViewEvent } from './canvas-view.js'
import { HelixCanvasZoomEvent } from './canvas-zoom.js'
import { HelixCaretEvent } from './caret.js'
import { HelixClearEvent } from './clear.js'
import { HelixCollapseEvent } from './collapse.js'
import { HelixCompleteEvent } from './complete.js'
import { HelixConnectEvent } from './connect.js'
import { HelixConsoleEvent } from './console.js'
import { HelixCopyEvent } from './copy.js'
import { HelixCopyErrorEvent } from './copy-error.js'
import { HelixCreateEvent } from './create.js'
import { HelixDismissEvent } from './dismiss.js'
import { HelixEditEvent } from './edit.js'
import { HelixEndEvent } from './end.js'
import { HelixExpandEvent } from './expand.js'
import { HelixFacetEvent } from './facet.js'
import { HelixFilterEvent } from './filter.js'
import { HelixFilteredEvent } from './filtered.js'
import { HelixGraphFilterEvent } from './graph-filter.js'
import { HelixGraphLayoutEvent } from './graph-layout.js'
import { HelixGraphPanEvent } from './graph-pan.js'
import { HelixGraphPartChangeEvent } from './graph-part-change.js'
import { HelixGraphReadyEvent } from './graph-ready.js'
import { HelixGraphSignalEvent } from './graph-signal.js'
import { HelixGraphZoomEvent } from './graph-zoom.js'
import { HelixHistoryEvent } from './history.js'
import { HelixLoadEvent } from './load.js'
import { HelixLoadMoreEvent } from './load-more.js'
import { HelixMapClusterEvent } from './map-cluster.js'
import { HelixMapPanEvent } from './map-pan.js'
import { HelixMapPartChangeEvent } from './map-part-change.js'
import { HelixMapReadyEvent } from './map-ready.js'
import { HelixMapRotateEvent } from './map-rotate.js'
import { HelixMapTiltEvent } from './map-tilt.js'
import { HelixMapZoomEvent } from './map-zoom.js'
import { HelixMoveEvent } from './move.js'
import { HelixNavigateEvent } from './navigate.js'
import { HelixNextEvent } from './next.js'
import { HelixPanelResizeEvent } from './panel-resize.js'
import { HelixPinEvent } from './pin.js'
import { HelixPreviousEvent } from './previous.js'
import { HelixRangeChangeEvent } from './range-change.js'
import { HelixReadEvent } from './read.js'
import { HelixReconnectEvent } from './reconnect.js'
import { HelixRejectEvent } from './reject.js'
import { HelixRelabelEvent } from './relabel.js'
import { HelixRemoveEvent } from './remove.js'
import { HelixReorderEvent } from './reorder.js'
import { HelixReorderedEvent } from './reordered.js'
import { HelixResizeEvent } from './resize.js'
import { HelixResizedEvent } from './resized.js'
import { HelixSampleEndEvent } from './sample-end.js'
import { HelixSampleStartEvent } from './sample-start.js'
import { HelixScrolledEvent } from './scrolled.js'
import { HelixSelectEvent } from './select.js'
import { HelixSelectedEvent } from './selected.js'
import { HelixSendEvent } from './send.js'
import { HelixShortcutEvent } from './shortcut.js'
import { HelixSortEvent } from './sort.js'
import { HelixSortedEvent } from './sorted.js'
import { HelixSplitEvent } from './split.js'
import { HelixToggleEvent } from './toggle.js'
import { HelixTourAskEvent } from './tour-ask.js'
import { HelixTypingEvent } from './typing.js'

export type {
  AuraFallbackDetail,
  CanvasView,
  CaretDetail,
  ChangeDetail,
  CompleteDetail,
  ConnectDetail,
  ConsoleDetail,
  CopyDetail,
  CreateDetail,
  DismissDetail,
  FacetDetail,
  FilterDetail,
  GraphFilterDetail,
  GraphLayoutDetail,
  GraphPartChangeDetail,
  GraphSignalDetail,
  MapClusterDetail,
  MapPanDetail,
  MapPartChangeDetail,
  MapRotateDetail,
  MapTiltDetail,
  MapZoomDetail,
  MoveDetail,
  NavigateDetail,
  OpenDetail,
  RangeDetail,
  ReadDetail,
  ReconnectDetail,
  Refusal,
  RefusedFile,
  RejectDetail,
  RelabelDetail,
  RemoveDetail,
  ResizeDetail,
  ScrolledDetail,
  SelectDetail,
  SendDetail,
  ShortcutDetail,
  SkipDetail,
  SortDetail,
  ToggleDetail,
  TourAskDetail,
  TypingDetail,
  ViewportPanDetail,
  ViewportZoomDetail,
} from './details.js'
export { helixEventNames } from './names.js'
export {
  HelixActionEvent,
  HelixActivateEvent,
  HelixAuraFallbackEvent,
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCloseEvent,
  HelixBeforeCollapseEvent,
  HelixBeforeEditEvent,
  HelixBeforeMoveEvent,
  HelixBeforeOpenEvent,
  HelixBeforePanelResizeEvent,
  HelixBeforePinEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixBeforeResizeEvent,
  HelixBeforeSplitEvent,
  HelixBeforeToggleEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixCaretEvent,
  HelixClearEvent,
  HelixCollapseEvent,
  HelixCompleteEvent,
  HelixConnectEvent,
  HelixConsoleEvent,
  HelixCopyErrorEvent,
  HelixCopyEvent,
  HelixCreateEvent,
  HelixDismissEvent,
  HelixEditEvent,
  HelixEndEvent,
  HelixExpandEvent,
  HelixFacetEvent,
  HelixFilterEvent,
  HelixFilteredEvent,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  HelixHistoryEvent,
  HelixLoadEvent,
  HelixLoadMoreEvent,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  HelixMoveEvent,
  HelixNavigateEvent,
  HelixNextEvent,
  HelixPanelResizeEvent,
  HelixPinEvent,
  HelixPreviousEvent,
  HelixRangeChangeEvent,
  HelixReadEvent,
  HelixReconnectEvent,
  HelixRejectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
  HelixReorderEvent,
  HelixReorderedEvent,
  HelixResizedEvent,
  HelixResizeEvent,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  HelixScrolledEvent,
  HelixSelectEvent,
  HelixSelectedEvent,
  HelixSendEvent,
  HelixShortcutEvent,
  HelixSortEvent,
  HelixSortedEvent,
  HelixSplitEvent,
  HelixToggleEvent,
  HelixTourAskEvent,
  HelixTypingEvent,
}

/**
 * Every event class, and the one place a new one is registered: a class in a
 * module of its own, imported above, and named here and in `names.ts`.
 *
 * The map below is derived from this rather than written beside it, so a class
 * that is in here is typed and one that is not is absent from both halves at
 * once. Kept by hand the two drifted, and nothing failed when they did: a
 * consumer writing `addEventListener('helix-navigate', …)` got `Event` and had
 * to reach into `detail` through a cast. The build fails on an exported event
 * class left out of this object, which is the only step left that can be
 * forgotten.
 */
const registry = {
  HelixActionEvent,
  HelixActivateEvent,
  HelixAuraFallbackEvent,
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCloseEvent,
  HelixBeforeCollapseEvent,
  HelixBeforeEditEvent,
  HelixBeforeMoveEvent,
  HelixBeforeOpenEvent,
  HelixBeforePanelResizeEvent,
  HelixBeforePinEvent,
  HelixBeforeReconnectEvent,
  HelixBeforeRelabelEvent,
  HelixBeforeResizeEvent,
  HelixBeforeSplitEvent,
  HelixBeforeToggleEvent,
  HelixCanvasEditEvent,
  HelixCanvasPanEvent,
  HelixCanvasViewEvent,
  HelixCanvasZoomEvent,
  HelixCaretEvent,
  HelixClearEvent,
  HelixCollapseEvent,
  HelixCompleteEvent,
  HelixConnectEvent,
  HelixConsoleEvent,
  HelixCopyErrorEvent,
  HelixCopyEvent,
  HelixCreateEvent,
  HelixDismissEvent,
  HelixEditEvent,
  HelixEndEvent,
  HelixExpandEvent,
  HelixFacetEvent,
  HelixFilterEvent,
  HelixFilteredEvent,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
  HelixHistoryEvent,
  HelixLoadEvent,
  HelixLoadMoreEvent,
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
  HelixMoveEvent,
  HelixNavigateEvent,
  HelixNextEvent,
  HelixPanelResizeEvent,
  HelixPinEvent,
  HelixPreviousEvent,
  HelixRangeChangeEvent,
  HelixReadEvent,
  HelixReconnectEvent,
  HelixRejectEvent,
  HelixRelabelEvent,
  HelixRemoveEvent,
  HelixReorderEvent,
  HelixReorderedEvent,
  HelixResizedEvent,
  HelixResizeEvent,
  HelixSampleEndEvent,
  HelixSampleStartEvent,
  HelixScrolledEvent,
  HelixSelectEvent,
  HelixSelectedEvent,
  HelixSendEvent,
  HelixShortcutEvent,
  HelixSortEvent,
  HelixSortedEvent,
  HelixSplitEvent,
  HelixToggleEvent,
  HelixTourAskEvent,
  HelixTypingEvent,
} as const

type Registry = typeof registry

/**
 * The registry keyed by what each class dispatches as.
 *
 * `eventName` is `static readonly` with no annotation, so TypeScript infers the
 * string literal and it can be used as a key. That is also what makes the name
 * on the class the single source of it: the map key, the dispatch and the
 * listener all read the same declaration.
 */
type HelixEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends HelixEventMap {}
}
