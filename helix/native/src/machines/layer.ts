/**
 * A layer's machine: whether it stands open, how a reader dismisses it,
 * where its focus goes, and where it stands against its anchor.
 *
 * **A layer opens on its element's toggle**, which holds the prop its `open`
 * binds, so a press, a dismissal, and the page writing the prop turn one
 * toggle. **A dismissal asks the toggle to close**, which sends its `closes`
 * event first, so a handler that refuses it keeps the layer open.
 *
 * **A reader dismisses a layer as `closedby` says**, which is `closerequest`
 * for a modal layer and `any` for any other where it names none, as the web
 * defaults `<dialog closedby>`:
 *
 * - A close request: Escape from a hardware keyboard, heard anywhere in the
 *   app through the keys capability's `listenAnywhere`; a phone's back, which
 *   Android sends; and a screen reader's escape, VoiceOver's two-finger Z,
 *   which iOS sends as `onAccessibilityEscape`. The last layer opened alone
 *   takes each.
 * - A press outside: on a modal layer's scrim or a sheet's, and on the app
 *   outside every layer for any other. A press on the layer's anchor is the
 *   anchor's.
 *
 * **A layer that `refuses` answers a press outside it that `closedby`
 * keeps open**: its part is `data-refused` for the length of the motion its
 * rules give it then, as the web's dialog swells and settles, and a press
 * while it moves starts the motion again.
 *
 * **An anchored layer that names a `presentation` may be a sheet** along the
 * window's bottom edge: under `auto` in a window narrower than 30rem at the
 * reader's text size, as core's `presentedAs` decides it for the web, and
 * always under `sheet`. A sheet is placed by no anchor, and its element is in
 * the state `sheet` and in no `placed-` or `aligned-` state.
 *
 * **A layer that stands open `alone` is one of its kind open at a time**,
 * as `layer-alone.ts` says.
 *
 * **A band stands under its anchor across the window**, placed by no
 * side, as `layer-band.ts` says, so its element is in no `placed-` or
 * `aligned-` state.
 *
 * **A press in the anchor reaches the layer** as its `presses` says, and a
 * tooltip's `hint` describes that press and shows the layer on its long
 * press, as `layer-anchor.ts` says. A tooltip leaves focus where it is. An
 * anchored layer's part is `data-placed` once Floating UI has placed it.
 */
import { NO_INSETS } from '@fusion.dev/helix-core/capabilities/environment'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { AnchorPress } from '../render/anchored'
import type { Behavior, Props } from '../render/behavior'
import type { Layered } from '../render/layered'
import { useTargetView } from '../render/targets'
import { useLayerHost } from '../root/layers'
import type { Family } from '../style/form'
import type { Around } from './binder'
import { kindOf, useAlone } from './layer-alone'
import { type Landing, returnsOf, useAnchorOut } from './layer-anchor'
import { useArrow } from './layer-arrow'
import { useBanded } from './layer-band'
import { useLayerFocus } from './layer-focus'
import { type Placer, placerFor } from './layer-place'
import { layerNode, readLayer, useSheet } from './layer-read'
import { useRefusal } from './layer-refusal'
import { useCloseRequests } from './layer-requests'
import { openOf, placedOf, shownBy, statedBy, statesOf } from './layer-states'
import { type Swiper, useLayerSwipe, useStill } from './layer-swipe'
import { answeredFirst, partView, tellBack } from './layer-view'
import { dismisses, inside } from './layering'
import { boundTo } from './props'
import type { Turned } from './toggle'

/** The host's place in the window where no host measures one. */
const ORIGIN = { x: 0, y: 0 } as const

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measures {
  readonly measureInWindow?: (
    done: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

/** What a layer's machine reads beside its element's props. */
export interface LayerAround {
  /** How the layer is placed, chosen once for its element. */
  readonly place: Placer
  /** How the layer swipes, chosen once for its element: as its node says, or not at all. */
  readonly swipe: Swiper
  /** The element's toggle, which the layer opens on. */
  readonly toggled: Turned | undefined
  /**
   * Whether the layer stands open where no toggle holds it, as a machine
   * bound before it computes, as a toast's stack stands open while it holds
   * a message.
   */
  readonly shown?: boolean | undefined
  /** Where the layer writes what it gives the presses its own element draws in its anchor. */
  readonly anchored?: { part?: string; press?: AnchorPress | undefined }
  /** The element's stack of pages, where it shows one, which a close request goes back in first. */
  readonly stacked?: Around['stacked'] | undefined
  /** What a machine bound before the layer answers for it, as a tour stop's, and what the layer tells it. */
  readonly asked?: Around['layering'] | undefined
  /** What a machine bound before the layer computes under a name its attributes bind. */
  readonly stated?: (name: string) => unknown
}

/**
 * Hosts a layer: the states it gives the host, `open` and the side it
 * landed on, and what its drawing reads.
 */
export const useLayer = (
  family: Family,
  props: Props,
  use: MachineUse,
  { anchored: out, asked, place, shown, stacked, stated, swipe, toggled }: LayerAround,
): Behavior => {
  const { anchorPart, closedBy, modal, node, notice, offset, part, placedAgainst, ...read } =
    readLayer(family, props, use, stated)
  /* A look alone, as a tour's spotlight: no touch, no key, no focus. */
  const decorative = node?.attributes?.decorative === true
  const open = openOf(toggled?.checked, shown, read.open)
  const targeted = useTargetView(read.target)
  const host = useLayerHost()
  const key = useRef({}).current
  const [view, setView] = useState<unknown>(null)
  const [anchor, setAnchor] = useState<unknown>(null)
  const window = useWindowDimensions()
  const keyboard = host?.keyboard ?? 0
  const sheet = useSheet(read.presentation, window.width)
  const arrow = useArrow(boundTo(use, 'arrow', 'part'))
  const placed = place({
    active: open && !sheet && placedAgainst,
    ...(arrow.pointer === undefined ? {} : { arrow: arrow.pointer }),
    crossOffset: read.crossOffset,
    flip: read.flip,
    keyboard,
    offset,
    origin: host?.origin ?? ORIGIN,
    placement: read.placement,
  })
  /* The anchor, measured as a touch outside the layers starts, so a press on
     it is the anchor's own. */
  const anchorBox = useRef<[number, number, number, number] | undefined>(undefined)
  const refusal = useRefusal(node, open)
  /* Whether a reader dismissed the layer, which focus returns to the anchor
     for under `returns: 'dismissed'`, cleared as it opens again. */
  const dismissal = useRef(false)
  if (open) {
    dismissal.current = false
  }
  const latest = useRef({ asked, closedBy, open, refusal, stacked, toggled })
  latest.current = { asked, closedBy, open, refusal, stacked, toggled }
  /* Asks the toggle to close, where the way the reader asked is one the
     layer takes, and answers a press outside it keeps open. */
  const dismiss = useCallback((by: 'outside' | 'request' | 'swipe') => {
    const answered = answeredFirst(by, latest.current)
    if (answered !== undefined) {
      return answered
    }
    const { closedBy: allowed, open: standing, toggled: turned } = latest.current
    const takes = dismisses(allowed, by)
    if (standing && takes && turned !== undefined) {
      dismissal.current = true
      turned.turn()
    } else if (standing && by === 'outside') {
      latest.current.refusal.answer()
    }
    return takes
  }, [])
  const top = useCallback(() => host?.top(key) !== false, [host, key])
  const swiped = swipe(family, props, use, {
    dismiss: () => dismiss('swipe'),
    node,
    open,
    sheet,
  })
  useCloseRequests({ decorative, dismiss, modal, notice, open, top, view })
  const tooltip = node?.attributes?.role === 'tooltip'
  /* Where focus lands as a press or a key in the anchor opens the layer. */
  const landing = useRef<Landing | undefined>(undefined)
  /* The first press drawn in the anchor, which focus goes back to. */
  const pressView = useRef<unknown>(null)
  const stops = useLayerFocus({
    anchor: () => pressView.current ?? anchor,
    /* A layer its anchor's press opens gives focus back to that anchor. */
    dismissed: () => dismissal.current,
    enters: read.enters,
    landing,
    layer: () => view,
    modal,
    /* A tooltip describes what holds focus, and leaves it there. */
    moves: !tooltip && !decorative,
    open,
    returns: returnsOf(read.presses, read.holds, read.returns),
    reveal: swiped.reveal,
    top,
  })
  /* One of a kind open at a time, where the node says so, as a megamenu's. */
  const onKin = useAlone(kindOf(family, node), { anchor: () => anchor, open, toggled })
  const outside = useCallback(
    (x: number, y: number) => {
      if (!inside(anchorBox.current, x, y) && !onKin(x, y)) {
        dismiss('outside')
      }
    },
    [dismiss, onKin],
  )
  /* Where the anchor stands, read again as the layer opens and moves. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new place is a moved anchor
  useEffect(() => {
    if (!open) {
      return
    }
    ;(anchor as Measures | null)?.measureInWindow?.((x, y, width, height) => {
      anchorBox.current = [x, y, width, height]
    })
  }, [anchor, open, placed.at])
  const holdsReader = modal && open
  /* A press outside reaches a layer that is not modal, that any dismissal
     closes, and that is not a look alone. */
  const takesOutside = !modal && closedBy === 'any' && !decorative
  const banded = useMemo(() => (read.band ? { band: true } : {}), [read.band])
  const insets = host?.insets ?? NO_INSETS
  const layered = useMemo<Layered>(
    () => ({
      anchored: placedAgainst && !sheet,
      ...(placed.at === undefined ? {} : { at: placed.at }),
      ...banded,
      backdrop: () => {
        dismiss('outside')
      },
      corner: arrow.corner,
      decorative,
      ...(swiped.edge === undefined ? {} : { edge: swiped.edge }),
      floating: placed.floating,
      key,
      measured: placed.measured,
      modal: holdsReader,
      ...(notice ? { notice } : {}),
      open,
      ...refusal.layered,
      ...(takesOutside ? { outside } : {}),
      ...(swiped.scroller === undefined ? {} : { scroller: swiped.scroller }),
      sheet,
      stops,
      viewport: {
        height: Math.max(0, window.height - keyboard),
        insets,
        tall: window.height,
        width: window.width,
      },
    }),
    [
      arrow.corner,
      decorative,
      dismiss,
      holdsReader,
      insets,
      key,
      keyboard,
      notice,
      open,
      outside,
      placed,
      placedAgainst,
      takesOutside,
      banded,
      refusal.layered,
      sheet,
      stops,
      swiped.edge,
      swiped.scroller,
      window.height,
      window.width,
    ],
  )
  const ref = useCallback((handed: unknown) => setView(handed), [])
  const anchored = useCallback(
    (handed: unknown) => {
      setAnchor(handed)
      placed.reference(handed)
    },
    [placed.reference],
  )
  /* The registered view stands in for an anchor part, as it registers and leaves. */
  useEffect(() => {
    if (read.targeting) {
      anchored(targeted)
    }
  }, [anchored, read.targeting, targeted])
  const presses = useAnchorOut(out, anchorPart, {
    arrows: read.arrows,
    enter: stops.enter,
    enters: read.enters,
    hint: read.hint,
    holds: read.holds,
    landing,
    open,
    presses: read.presses,
    pressView,
    toggled,
    tooltip,
  })
  tellBack(asked, stops.holds, view)
  const states = { ...statesOf(open, sheet, placed), ...swiped.states }
  const pointer = boundTo(use, 'arrow', 'part')
  const settled = placedOf(placedAgainst, open, sheet, placed)
  return {
    marks: [],
    parts: {
      host: { states },
      [part]: {
        ...swiped.binding,
        layer: layered,
        states: { ...states, ...refusal.states, ...settled },
        view: {
          ...partView({ decorative, modal, notice, tooltip }),
          collapsable: false,
          onAccessibilityEscape: () => dismiss('request'),
          ref,
        },
      },
      ...(anchorPart === undefined
        ? {}
        : { [anchorPart]: { ...presses, view: { collapsable: false, ref: anchored } } }),
      ...(pointer === undefined ? {} : { [pointer]: arrow.binding(placed) }),
    },
  }
}

/**
 * Hosts the layer `use` binds on each render of an element, beside its
 * toggle, placing it against its anchor where it names one.
 */
export const layering = (
  family: Family,
  use: MachineUse,
): ((
  props: Props,
  around: {
    readonly anchored: { part?: string; press?: AnchorPress | undefined }
    readonly layering?: Around['layering'] | undefined
    readonly stacked?: Around['stacked'] | undefined
    readonly bound: readonly Behavior[]
    readonly toggled: Turned | undefined
  },
) => Behavior) => {
  const node = layerNode(family.tree ?? [], boundTo(use, 'part', 'part') ?? '')
  /* A band stands under its anchor across the window, on no side of it. */
  const place =
    node?.attributes?.band === true
      ? useBanded
      : placerFor(
          boundTo(use, 'anchor', 'part') !== undefined ||
            boundTo(use, 'target', 'prop') !== undefined,
        )
  const swipe = node?.attributes?.swipe === undefined ? useStill : useLayerSwipe
  const opensOn = boundTo(use, 'open', 'prop')
  return (props, { anchored, bound, layering: asked, stacked, toggled }) =>
    useLayer(family, props, use, {
      anchored,
      asked,
      place,
      shown: shownBy(bound, opensOn),
      stacked,
      stated: (name) => statedBy(bound, name),
      swipe,
      toggled,
    })
}
