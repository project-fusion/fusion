/**
 * What a layer gives the presses drawn in its anchor: a popover's trigger
 * opens it and says whether it is open, and a tooltip describes the control
 * it holds, shows on a long press of it, and closes as it is used.
 *
 * **A press in the anchor reaches the layer once its own event stands**, as
 * the web's trigger slot hears the click after the trigger's own listeners,
 * and a tooltip's as it presses, before that event, as the web's tooltip
 * hears the click first:
 * under `presses: 'toggle'` it opens the layer or closes it, under `close` it
 * closes an open one, and under `none` it leaves it. A press on the anchor
 * is never a press outside the layer, so the layer's own dismissal leaves it
 * to the press.
 *
 * **A tooltip's `hint` is each press's description**, a phone's hint, and
 * keyboard focus landing on the press shows the bubble until focus leaves,
 * as `:focus-visible` shows it on the web. A long press on the press shows
 * the bubble where the press has no long press of its own, as the plan's
 * decision on hover-only patterns says and `long-press.ts` ranks it. A press
 * already named by the words is not described by them again, as the web's
 * tooltip leaves an icon button named Settings undescribed by a tooltip that
 * reads Settings.
 *
 * **A layer that `holds` opens on a long press of a press in its anchor**,
 * ranked as the press's own long press, as a speed dial opens on one under
 * `open-on="long-press"`. **A layer that takes `arrows` opens on Down or Up**
 * from a hardware keyboard on a press in its anchor while it stands closed,
 * with focus on its first or its last control, and with Alt where it holds,
 * since a press whose own action is its quick press leaves the arrows to the
 * page. A press, a long press, and a key each say where focus lands as they
 * open the layer. **A layer that enters on Down** takes Down alone, opening
 * it with focus on its first control or moving focus there where it stands
 * open, and a press that opens it leaves focus on the press, as a
 * megamenu's trigger does.
 */
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { createElement, type ReactNode, useMemo, useRef } from 'react'
import { type AnchorPress, AnchorPressContext } from '../render/anchored'
import type { PartBinding } from '../render/behavior'
import type { Enters, Presses, Returns } from './layer-read'
import type { Turned } from './toggle'

/** Where focus lands in a layer a press or a key in its anchor opened: its first control or its last. */
export type Landing = 'first' | 'last'

/** What the anchor's presses read of the layer, at one render. */
interface Anchoring {
  /** Whether Down and Up open the layer, with Alt where it `holds`. */
  readonly arrows: boolean
  /** Moves focus to the layer's first control, as Down does on a layer that enters on it. */
  readonly enter?: () => void
  /**
   * Where focus goes as the layer opens: only on Down on a press in the
   * anchor, `down`, which opens the layer where it is closed and moves
   * focus into it where it is open, as a megamenu's trigger does; and a
   * press that opens it leaves focus where it is.
   */
  readonly enters?: Enters
  /** The words a tooltip describes each press with. */
  readonly hint: string | undefined
  /** Whether a long press opens the layer as the press's own long press. */
  readonly holds: boolean
  /** Where focus lands as a press or a key in the anchor opens the layer, which this writes. */
  readonly landing: { current: Landing | undefined }
  /** The view of the first press drawn in the anchor, which focus goes back to, which this writes. */
  readonly pressView?: { current: unknown }
  readonly open: boolean
  readonly presses: Presses
  readonly toggled: Turned | undefined
  /** Whether the layer is a tooltip, which shows as keyboard focus lands on its anchor. */
  readonly tooltip: boolean
}

/** Whether a key is Down or Up, with Alt held or not as `alt` says, and nothing else. */
const arrowOf = (press: KeyPress, alt: boolean): Landing | undefined => {
  if (press.control || press.meta || press.shift || press.alt !== alt) {
    return undefined
  }
  return press.key === 'ArrowDown' ? 'first' : press.key === 'ArrowUp' ? 'last' : undefined
}

/** What the anchor's presses read as they run: the layer as it stands now. */
interface Now {
  readonly enter?: (() => void) | undefined
  readonly enters?: Enters | undefined
  readonly open: boolean
  readonly presses: Presses
  readonly toggled: Turned | undefined
}

/** Where the presses' handlers find the layer, how it opens, and whether focus opened it. */
interface Holding {
  readonly byFocus: { current: boolean }
  readonly pressView?: { current: unknown } | undefined
  readonly landing: { current: Landing | undefined }
  readonly latest: { readonly current: Now }
}

/** What the anchor's presses are given, read at one render. */
type Asked = Omit<Anchoring, 'enter' | 'enters' | 'hint' | 'landing' | 'pressView' | 'toggled'> & {
  /** Whether Down takes focus into the layer, as `enters: 'down'` says. */
  readonly descends: boolean
  readonly words: string
}

/** Opens the layer as a press or a key asks, with focus landing where it says. */
const opening =
  ({ landing, latest }: Holding) =>
  (at: Landing): void => {
    const now = latest.current
    if (!now.open) {
      landing.current = at
      now.toggled?.turn()
    }
  }

/** Opens the layer on Down or Up, with Alt where it holds, and says whether it took the key. */
const arrowing =
  (holding: Holding, holds: boolean) =>
  (press: KeyPress): boolean => {
    const at = holding.latest.current.open ? undefined : arrowOf(press, holds)
    if (at !== undefined) {
      opening(holding)(at)
    }
    return at !== undefined
  }

/**
 * Takes Down alone into a layer that enters on it: opens the layer with
 * focus on its first control where it stands closed, and moves focus to
 * that control where it stands open, as a megamenu's trigger does. Up and
 * every other key are left to the press.
 */
const descending =
  (holding: Holding) =>
  (press: KeyPress): boolean => {
    if (arrowOf(press, false) !== 'first') {
      return false
    }
    const now = holding.latest.current
    if (now.open) {
      now.enter?.()
    } else {
      opening(holding)('first')
    }
    return true
  }

/** Opens a tooltip as keyboard focus lands on its anchor, and closes what focus opened as it leaves. */
const focusing =
  ({ byFocus, latest }: Holding) =>
  (on: boolean): void => {
    const now = latest.current
    if (on && !now.open) {
      byFocus.current = true
      now.toggled?.turn()
    } else if (!on && now.open && byFocus.current) {
      byFocus.current = false
      now.toggled?.turn()
    }
  }

/** Turns the layer as a press in the anchor asks, once its own event stands. */
const pressing =
  ({ landing, latest }: Holding) =>
  (): void => {
    const now = latest.current
    if (now.presses === 'toggle' || (now.presses === 'close' && now.open)) {
      /* A layer that enters on Down leaves focus where a press put it. */
      if (!now.open && now.enters !== 'down') {
        landing.current = 'first'
      }
      now.toggled?.turn()
    }
  }

/**
 * Keeps the view of the first press drawn in the anchor, and lets it go as
 * that press goes, so focus goes back to a press and never to the box
 * around it.
 */
const seeing =
  (pressView: { current: unknown }) =>
  (node: unknown): void => {
    if (node !== null && (pressView.current === null || pressView.current === undefined)) {
      pressView.current = node
    } else if (node === null) {
      pressView.current = null
    }
  }

/** What the layer gives each press in its anchor where it holds or shows words. */
const holdingOf = (holding: Holding, { holds, tooltip, words }: Asked): Partial<AnchorPress> => {
  const shows = words !== ''
  return {
    ...(tooltip && shows ? { focused: focusing(holding) } : {}),
    ...(shows ? { hint: words } : {}),
    ...(shows || holds ? { hold: () => opening(holding)('first') } : {}),
    ...(holds ? { rank: 'own' as const } : {}),
  }
}

/** What the layer gives each press in its anchor, or nothing where it asks nothing of them. */
const anchorPressOf = (holding: Holding, asked: Asked): AnchorPress | undefined => {
  const { arrows, descends, holds, open, presses, words } = asked
  if (presses === 'none' && words === '' && !holds && !arrows && !descends) {
    return undefined
  }
  return {
    ...(presses === 'toggle' || holds ? { expanded: open } : { early: true }),
    ...(arrows ? { arrow: arrowing(holding, holds) } : {}),
    ...(descends ? { arrow: descending(holding) } : {}),
    ...holdingOf(holding, asked),
    pressed: pressing(holding),
    ...(holding.pressView === undefined ? {} : { seen: seeing(holding.pressView) }),
  }
}

/**
 * The binding the layer gives its anchor's part beside its view: the
 * context each press inside reads, where the layer asks anything of them,
 * and what it gives a press its own element draws in the anchor, which
 * reads no context its own element provides.
 */
export const useAnchorPresses = ({
  arrows,
  enter,
  enters,
  hint,
  holds,
  landing,
  open,
  presses,
  pressView,
  toggled,
  tooltip,
}: Anchoring): { readonly binding: Pick<PartBinding, 'wrap'>; readonly value?: AnchorPress } => {
  const latest = useRef<Now>({ enter, enters, open, presses, toggled })
  latest.current = { enter, enters, open, presses, toggled }
  const descends = enters === 'down'
  /* Whether keyboard focus opened the layer, which focus leaving then closes. */
  const byFocus = useRef(false)
  const words = hint?.trim() ?? ''
  const value = useMemo(
    () =>
      anchorPressOf(
        { byFocus, landing, latest, pressView },
        { arrows, descends, holds, open, presses, tooltip, words },
      ),
    [arrows, descends, holds, landing, open, presses, pressView, tooltip, words],
  )
  return value === undefined
    ? { binding: {} }
    : {
        binding: {
          wrap: (view: ReactNode) => createElement(AnchorPressContext.Provider, { value }, view),
        },
        value,
      }
}

/**
 * Where focus goes as the layer closes: to its anchor, where a press in the
 * anchor opens it, and only where the layer held focus, or only where a
 * reader dismissed it, where it says so.
 */
export const returnsOf = (
  presses: Presses,
  holds: boolean,
  returns: Returns,
): 'anchor' | 'dismissed' | 'held' | undefined => {
  if (presses !== 'toggle' && !holds) {
    return undefined
  }
  return returns === 'always' ? 'anchor' : returns
}

/**
 * What the layer gives its anchor's part, written where the presses its own
 * element draws in that part read it.
 */
export const useAnchorOut = (
  out: { part?: string; press?: AnchorPress | undefined } | undefined,
  anchorPart: string | undefined,
  anchoring: Anchoring,
): Pick<PartBinding, 'wrap'> => {
  const { binding, value } = useAnchorPresses(anchoring)
  if (out !== undefined && anchorPart !== undefined) {
    out.part = anchorPart
    out.press = value
  }
  return binding
}
