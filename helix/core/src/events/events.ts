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
 * **Core holds the events more than one family sends, and a family holds its
 * own.** An event only one family sends lives in that family's `events/` folder
 * (`helix/headless/src/<family>/events/`, or the styled family's when only the
 * styled tier sends it), which registers it, types it on `addEventListener`
 * with its own augmentation of `HTMLElementEventMap`, and adds its name to
 * `names.ts` through `registerEventNames`. Importing a family therefore types
 * its events, and this map carries only the shared ones.
 *
 * **One module per class, and this file gathers the shared ones.** Each class is in a
 * file of its own beside this one, named after its event (`before-open.ts`
 * holds `HelixBeforeOpenEvent`), and declares its name as `static readonly
 * eventName`, which is how `helix component audit` finds them. What they carry
 * is in `details.ts`, types only. This file re-exports both, keeps the
 * registry, and types `addEventListener`.
 *
 * **Apart because a bundle keeps a class it never uses.** The compiler writes
 * `static readonly eventName` as a static block, and Bun and Rollup both treat
 * one as a side effect, so a class in a shared module stayed in every bundle
 * that imported anything from that module. With every class in one
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
 * - **Coordination** (`helix-before-select`, `helix-dismiss`, `helix-before-change`)
 *   bubbles and is composed, so a parent or a router can intercept it across a
 *   shadow boundary.
 */

import { HelixActivateEvent } from './activate.js'
import { HelixBeforeActivateEvent } from './before-activate.js'
import { HelixBeforeChangeEvent } from './before-change.js'
import { HelixBeforeCheckEvent } from './before-check.js'
import { HelixBeforeCloseEvent } from './before-close.js'
import { HelixBeforeFilterEvent } from './before-filter.js'
import { HelixBeforeListenEvent } from './before-listen.js'
import { HelixBeforeNavigateEvent } from './before-navigate.js'
import { HelixBeforeOpenEvent } from './before-open.js'
import { HelixBeforePinEvent } from './before-pin.js'
import { HelixBeforeReorderEvent } from './before-reorder.js'
import { HelixBeforeResizeEvent } from './before-resize.js'
import { HelixBeforeSelectEvent } from './before-select.js'
import { HelixBeforeSortEvent } from './before-sort.js'
import { HelixCheckEvent } from './check.js'
import { HelixClearEvent } from './clear.js'
import { HelixCompleteEvent } from './complete.js'
import { HelixCopyEvent } from './copy.js'
import { HelixCopyErrorEvent } from './copy-error.js'
import { HelixDismissEvent } from './dismiss.js'
import { HelixExpandEvent } from './expand.js'
import { HelixFilterEvent } from './filter.js'
import { HelixFoundEvent } from './found.js'
import { HelixListenEvent } from './listen.js'
import { HelixLoadEvent } from './load.js'
import { HelixLoadMoreEvent } from './load-more.js'
import { HelixNavigateEvent } from './navigate.js'
import { HelixPinEvent } from './pin.js'
import { HelixPlotChangeEvent } from './plot-change.js'
import { HelixPlotTurnEvent } from './plot-turn.js'
import { HelixReadingChangeEvent } from './reading-change.js'
import { HelixReadingPressEvent } from './reading-press.js'
import { HelixReorderEvent } from './reorder.js'
import { HelixResizeEvent } from './resize.js'
import { HelixResizedEvent } from './resized.js'
import { HelixSelectEvent } from './select.js'
import { HelixSortEvent } from './sort.js'

export type {
  ActivateDetail,
  ChangeDetail,
  CheckDetail,
  CompleteDetail,
  CopyDetail,
  DismissDetail,
  FilterDetail,
  FoundDetail,
  ListenDetail,
  NavigateDetail,
  OpenDetail,
  PlotChangeDetail,
  PlotTurnDetail,
  PressPointerType,
  ReadingDetail,
  ReorderDetail,
  ResizeDetail,
  SelectDetail,
  SortDetail,
  ViewportPanDetail,
  ViewportZoomDetail,
} from './details.js'
export { helixEventNames } from './names.js'
export {
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCheckEvent,
  HelixBeforeCloseEvent,
  HelixBeforeFilterEvent,
  HelixBeforeListenEvent,
  HelixBeforeNavigateEvent,
  HelixBeforeOpenEvent,
  HelixBeforePinEvent,
  HelixBeforeReorderEvent,
  HelixBeforeResizeEvent,
  HelixBeforeSelectEvent,
  HelixBeforeSortEvent,
  HelixCheckEvent,
  HelixClearEvent,
  HelixCompleteEvent,
  HelixCopyErrorEvent,
  HelixCopyEvent,
  HelixDismissEvent,
  HelixExpandEvent,
  HelixFilterEvent,
  HelixFoundEvent,
  HelixListenEvent,
  HelixLoadEvent,
  HelixLoadMoreEvent,
  HelixNavigateEvent,
  HelixPinEvent,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  HelixReorderEvent,
  HelixResizedEvent,
  HelixResizeEvent,
  HelixSelectEvent,
  HelixSortEvent,
}

/**
 * Every event class more than one family sends, and the one place a new one is
 * registered: a class in a module of its own, imported above, and named here and in
 * `names.ts`. An event one family sends is registered in that family's folder.
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
  HelixActivateEvent,
  HelixBeforeActivateEvent,
  HelixBeforeChangeEvent,
  HelixBeforeCheckEvent,
  HelixBeforeCloseEvent,
  HelixBeforeFilterEvent,
  HelixBeforeListenEvent,
  HelixBeforeNavigateEvent,
  HelixBeforeOpenEvent,
  HelixBeforePinEvent,
  HelixBeforeReorderEvent,
  HelixBeforeResizeEvent,
  HelixBeforeSelectEvent,
  HelixBeforeSortEvent,
  HelixCheckEvent,
  HelixClearEvent,
  HelixCompleteEvent,
  HelixCopyErrorEvent,
  HelixCopyEvent,
  HelixDismissEvent,
  HelixExpandEvent,
  HelixFilterEvent,
  HelixFoundEvent,
  HelixListenEvent,
  HelixLoadEvent,
  HelixLoadMoreEvent,
  HelixNavigateEvent,
  HelixPinEvent,
  HelixPlotChangeEvent,
  HelixPlotTurnEvent,
  HelixReadingChangeEvent,
  HelixReadingPressEvent,
  HelixReorderEvent,
  HelixResizedEvent,
  HelixResizeEvent,
  HelixSelectEvent,
  HelixSortEvent,
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
