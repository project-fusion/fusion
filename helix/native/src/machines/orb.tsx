/**
 * An orb on a phone: the cloud of dots core's `OrbClock` computes, drawn on
 * the GPU through the GPU drawing capability, and what a screen reader hears
 * of it, which its host says from core's derivations, never from the dots.
 *
 * **The colors are the canvas part's own**, as the web's script reads them
 * off its canvas: its `color`, which is `--orb-color` or the words' color
 * around it, and its `text-decoration-color`, which is `--orb-ground` or the
 * page's background. `--orb-speed` scales the tempo.
 *
 * **It stops as the web's paint gate stops it.** While the app pauses its
 * motion it holds the frame it showed, with reduced motion it draws the
 * state's still frame, and while the app is in the background it draws
 * nothing new. A shape passed into its default region hides the dots.
 *
 * **Without react-native-skia it draws one still frame of the same dots** in
 * `react-native-svg`, an optional peer too, so the orb keeps its shape.
 */
import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import {
  ORB_MIN_RADIUS,
  OrbClock,
  type OrbColor,
  type OrbDot,
  orbDotColor,
  orbDots,
  orbShown,
  paramsFor,
  STILL_PHASE,
} from '@fusion.dev/helix-core/orb'
import { Children, useEffect, useRef } from 'react'
import { processColor } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, DrawingLook, Props } from '../render/behavior'
import { type DrawingBox, GpuDrawing, type Painter } from '../render/gpu-drawing'
import { useMotionPaused, useReducedMotion } from '../render/motion'
import { svg } from '../render/vector'
import type { Family } from '../style/form'
import { boundTo, given } from './props'

/** What an unreadable color answers with, mid gray in both modes, as the web's does. */
const GRAY: OrbColor = [128, 128, 128, 1]

/** A color React Native reads, as bytes and an alpha, or gray where it reads none. */
export const colorBytes = (value: unknown): OrbColor => {
  const packed = typeof value === 'string' ? processColor(value) : null
  if (typeof packed !== 'number') {
    return GRAY
  }
  /* `0xAARRGGBB`, as both platforms pack it. */
  const unsigned = packed >>> 0
  return [
    (unsigned >>> 16) & 255,
    (unsigned >>> 8) & 255,
    unsigned & 255,
    Math.round((((unsigned >>> 24) & 255) / 255) * 1000) / 1000,
  ]
}

/** The tempo `--orb-speed` sets, `1` where it sets none. */
const speedOf = (look: DrawingLook): number => {
  const speed = Number.parseFloat(String(look.custom['orb-speed'] ?? '1'))
  return Number.isFinite(speed) ? speed : 1
}

/** The words of a color for Skia and for a vector. */
const rgba = (color: OrbColor): string => `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`

/** Each dot with its fill, less those too faint to draw. */
const painted = (dots: readonly OrbDot[], ink: OrbColor, ground: OrbColor) =>
  dots.flatMap((dot) => {
    const color = orbDotColor(dot, ink, ground)
    return color === undefined ? [] : [{ color: rgba(color), dot }]
  })

/** The still frame a phone without react-native-skia draws, in `react-native-svg`. */
const stillFrame = (state: string, ink: OrbColor, ground: OrbColor) => (box: DrawingBox) => {
  const size = Math.round(box.width)
  if (size <= 0) {
    return null
  }
  const { Circle, Svg } = svg()
  const dots = painted(orbDots(size, STILL_PHASE, paramsFor(state)), ink, ground)
  return (
    <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
      {dots.map(({ color, dot }, index) => (
        <Circle
          cx={dot.x}
          cy={dot.y}
          fill={color}
          // biome-ignore lint/suspicious/noArrayIndexKey: a dot is its place in the sorted frame.
          key={index}
          r={Math.max(ORB_MIN_RADIUS, dot.radius)}
        />
      ))}
    </Svg>
  )
}

/** The dots, moving on the GPU, or still. */
const OrbDrawing = ({ look, state }: { readonly look: DrawingLook; readonly state: string }) => {
  const clock = useRef<OrbClock | null>(null)
  clock.current ??= new OrbClock(state)
  const reduced = useReducedMotion()
  const paused = useMotionPaused()
  /* The reader's own setting draws the still frame, and the app's pause holds the one shown. */
  const still = reduced && environment().read().reducedMotion
  useEffect(() => {
    const held = clock.current
    if (held !== null && held.state !== orbShown(state)) {
      held.turn(state, Date.now())
    }
  }, [state])
  useEffect(() => {
    if (still) {
      clock.current?.still()
    }
  }, [still])
  const ink = colorBytes(look.text.color)
  const ground = colorBytes(look.text.textDecorationColor)
  const speed = speedOf(look)
  const paint: Painter = (canvas, { Skia }, box, dt) => {
    const size = Math.round(box.width)
    const dots = clock.current?.frame(size, Date.now(), dt, speed, still) ?? []
    const fill = Skia.Paint()
    fill.setAntiAlias(true)
    for (const { color, dot } of painted(dots, ink, ground)) {
      fill.setColor(Skia.Color(color))
      canvas.drawCircle(dot.x, dot.y, Math.max(ORB_MIN_RADIUS, dot.radius), fill)
    }
  }
  return (
    <GpuDrawing
      fallback={stillFrame(state, ink, ground)}
      paint={paint}
      running={!reduced && !paused}
      still={`${state} ${rgba(ink)} ${rgba(ground)} ${still}`}
    />
  )
}

/** Draws an orb: its dots in its canvas part, and its state as a custom state. */
export const useOrb = (family: Family, props: Props, use: MachineUse): Behavior => {
  const state = orbShown(given(family, props, 'state'))
  const shown = boundTo(use, 'shown', 'state') ?? 'shown'
  /* A shape passed in stands in for the dots, which stop drawing, as the web's do. */
  const own = Children.toArray(props.children as never).length > 0
  return {
    marks: [state],
    parts: {
      canvas: own ? {} : { drawing: (look) => <OrbDrawing look={look} state={state} /> },
      host: { states: { [shown]: state } },
    },
  }
}
