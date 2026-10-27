/**
 * A part that fits its content, `grid-template-rows: fit()`: the web's `0fr`
 * to `1fr` row, drawn on a phone at its content's measured height.
 */

import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react'
import { type LayoutChangeEvent, View } from 'react-native'
import type { Style, Transition } from '../style/resolved'
import { Box } from './box'
import { reducedNow, useReducedMotion } from './motion'
import { firstPhase, fittedHeight, moving, type OpenPhase, phaseAfter } from './opening'
import { silent } from './semantics'
import { SharedBox } from './share'

/**
 * The open phase of a part that opens while `open` holds, moved by `move`,
 * and `onSettled` called with `open` or `closed` as each motion is done.
 * **Reduced motion moves nothing**, as the reader's setting or the app's
 * paused motion asks, so the phase goes straight to its end.
 */
export const useOpenPhase = (
  open: boolean,
  move: Transition | undefined,
  onSettled?: (phase: 'closed' | 'open') => void,
): OpenPhase => {
  const reduced = useReducedMotion()
  const length =
    reduced || reducedNow() || move === undefined ? 0 : move.duration + (move.delay ?? 0)
  const [phase, setPhase] = useState<OpenPhase>(() => firstPhase(open))
  const settled = useRef(onSettled)
  settled.current = onSettled
  useEffect(() => {
    setPhase((now) => phaseAfter(now, open ? 'open' : 'close', length > 0))
  }, [open, length])
  /* The motion-done signal: the transition's length after it starts. */
  useEffect(() => {
    if (!moving(phase)) {
      return undefined
    }
    const timer = setTimeout(() => setPhase((now) => phaseAfter(now, 'done', true)), length)
    return () => clearTimeout(timer)
  }, [phase, length])
  const last = useRef(phase)
  useEffect(() => {
    if (phase !== last.current && !moving(phase)) {
      settled.current?.(phase as 'closed' | 'open')
    }
    last.current = phase
  }, [phase])
  return phase
}

/** The properties that lay out what a part holds, which its measured content takes over. */
const LAYING = [
  'alignContent',
  'alignItems',
  'columnGap',
  'flexDirection',
  'flexWrap',
  'gap',
  'justifyContent',
  'rowGap',
] as const

/**
 * The part's own style, with the height its phase draws at and its overflow
 * hidden, and the style of the view inside it that is measured, which lays
 * out what the part holds.
 */
export const fittedStyles = (
  style: Style,
  height: number | undefined,
): { readonly inner: Style; readonly outer: Style } => {
  const outer: Record<string, number | string> = { ...style, overflow: 'hidden' }
  const inner: Record<string, number | string> = {}
  for (const key of LAYING) {
    const value = outer[key]
    if (value !== undefined) {
      inner[key] = value
      delete outer[key]
    }
  }
  delete outer.height
  if (height !== undefined) {
    outer.height = height
  }
  return { inner, outer }
}

/** What `useFitted` takes. */
interface Fitting {
  /** `0` closed, or `1` open. */
  readonly fit: 0 | 1
  /** How `grid-template-rows` moves, where it does. */
  readonly move: Transition | undefined
  readonly style: Style
}

/**
 * The part's style in its phase, its height's transition while it moves, and
 * the view that measures what it holds. **Closed, what it holds stays drawn
 * at no height.** Whether a screen reader reaches it is the part's
 * `visibility` to say, as on the web.
 */
export const useFitted = ({ fit, move, style }: Fitting) => {
  const phase = useOpenPhase(fit === 1, move)
  const [measured, setMeasured] = useState<number>()
  const [armed, setArmed] = useState(false)
  /* A close starts at the measured height, and moves to none a frame later. */
  useEffect(() => {
    if (phase !== 'closing') {
      setArmed(false)
      return undefined
    }
    const frame = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(frame)
  }, [phase])
  const { inner, outer } = fittedStyles(style, fittedHeight(phase, measured, armed))
  return {
    moves: moving(phase) && move !== undefined ? { height: move } : undefined,
    outer,
    phase,
    wrap: (children: ReactNode) => (
      <View
        onLayout={(event: LayoutChangeEvent) => setMeasured(event.nativeEvent.layout.height)}
        style={inner}
      >
        {children}
      </View>
    ),
  }
}

/** What `FittedBox` takes: a box's props, with how much of its content it shows. */
type FittedProps = ComponentProps<typeof Box> & {
  readonly fit: 0 | 1
}

/**
 * A box that fits its content, opening to the content's measured height and
 * closing to none as its `grid-template-rows` transition moves.
 */
export const FittedBox = ({
  children,
  fit,
  style,
  transitions = {},
  view,
  ...rest
}: FittedProps) => {
  const fitted = useFitted({ fit, move: transitions.fit, style })
  return (
    <Box
      {...rest}
      style={fitted.outer}
      transitions={{ ...transitions, ...fitted.moves }}
      view={view}
    >
      {fitted.wrap(children)}
    </Box>
  )
}

/** What `PartBox` takes: a box's props, and what its part's style says beside them. */
type PartProps = ComponentProps<typeof Box> & {
  readonly fit?: 0 | 1 | undefined
  readonly invisible?: true | undefined
  /** Whether the part takes an equal share of its row and is never narrower than its content. */
  readonly shares?: true | undefined
  readonly shown?: Style | undefined
}

/**
 * A part's box, which fits its content where its row is a `fit()`, and
 * which a screen reader passes over while it is `visibility: hidden`.
 * **A part that hides stays seen until its `visibility` transition ends**,
 * as the web keeps a closing part visible, and reachable by a screen
 * reader, for the transition's length. It shows again at once. A part that
 * `shares` its row is drawn as a `SharedBox`.
 */
export const PartBox = ({ fit, invisible, shares, shown, style, view, ...rest }: PartProps) => {
  const phase = useOpenPhase(invisible !== true, rest.transitions?.visibility)
  const hidden = invisible === true && phase === 'closed'
  const props = {
    ...rest,
    style: invisible === true && !hidden && shown !== undefined ? { ...style, ...shown } : style,
    view: hidden ? { ...view, ...silent } : view,
  }
  /* A part a driver moves keeps the height the driver gives it. */
  if (shares === true && fit === undefined && props.animated !== true) {
    return <SharedBox {...props} />
  }
  return fit === undefined || props.animated === true ? (
    <Box {...props} />
  ) : (
    <FittedBox fit={fit} {...props} />
  )
}
