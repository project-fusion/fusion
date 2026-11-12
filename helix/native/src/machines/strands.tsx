/**
 * A ribbon of strands on a phone: core's path and strands, drawn through
 * react-native-skia by the GPU drawing capability, as `strands-paint.ts`
 * lays them, in the canvas part's colors.
 *
 * **The colors are the canvas part's own**, as the web's script reads them
 * off its canvas: the glow on its `color`, the tint on its
 * `text-decoration-color`, the ground on its `outline-color`, and the peak on
 * its `caret-color` over a dark ground and its `column-rule-color` over a
 * light one.
 *
 * **It stops as the web's paint gate stops it.** While the app pauses its
 * motion it keeps the frame it showed, with reduced motion it draws one still
 * frame, and while the app is in the background it draws nothing new. It
 * draws at most thirty frames a second, as the web's does.
 *
 * **In its own box, always.** `travel`, `quiet`, and the stops are the web's:
 * a phone has no document to scroll or to find an id in.
 *
 * **Without react-native-skia, or where an effect does not compile, it
 * draws the band** the web lays under its canvas, in `react-native-svg`,
 * faded at its edges, and says `fallback`.
 */
import {
  arcLengths,
  boxPath,
  DUST,
  MAX_DUST,
  MAX_POINTS,
  MAX_STRANDS,
  MIN_STRANDS,
  paletteOf,
  type RibbonFrame,
  SPREAD,
  type StrandsPalette,
  type StrandsPattern,
} from '@fusion.dev/helix-core/strands'
import { useRef } from 'react'
import { loadSkia } from '../capabilities/gpu-drawing'
import type { MachineUse } from '../ir.generated'
import type { Behavior, DrawingLook, Props } from '../render/behavior'
import { type DrawingBox, GpuDrawing, type Painter } from '../render/gpu-drawing'
import { useMotionPaused, useReducedMotion } from '../render/motion'
import { svg } from '../render/vector'
import { mix } from '../style/color'
import type { Family } from '../style/form'
import { bytesOf, carriedColors, fadeOf, rgbOf } from './drawing-look'
import { given } from './props'
import { paintRibbon, type StrandsLook, strandsEffects } from './strands-paint'

/** How fast a `speed` of `1` moves, the web element's `PACE`. */
const PACE = 0.25

/**
 * The drawing ratio the web measures a strand's width in: three quarters of
 * the device's up to two, which a phone's screen of two or three pixels a
 * point gives as one and a half.
 */
const RATIO = 1.5

/** The settings a frame reads, off the element's props, clamped as the web clamps them. */
interface Settings {
  readonly at: number | undefined
  readonly bloom: number
  readonly clear: boolean
  readonly contrast: number
  readonly density: number
  readonly depth: number
  readonly drift: number
  readonly dust: number
  readonly gain: number
  readonly pattern: StrandsPattern
  readonly softness: number
  readonly speed: number
  readonly spread: number
}

const numberOf = (value: unknown, otherwise: number): number => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : otherwise
}

const share = (value: number): number => Math.min(1, Math.max(0, value))

const PATTERNS: readonly string[] = ['bend', 'ribbon', 'sweep', 'waves']

const settingsOf = (family: Family, props: Props): Settings => {
  const read = (name: string) => given(family, props, name)
  const at = read('at')
  const pattern = read('pattern')
  return {
    at: at === undefined || at === '' ? undefined : numberOf(at, 0.5),
    bloom: Math.max(0, numberOf(read('bloom'), 1)),
    clear: read('clear') === true,
    contrast: share(numberOf(read('contrast'), 1)),
    density: share(numberOf(read('density'), 0.8)),
    depth: share(numberOf(read('depth'), 1)),
    drift: share(numberOf(read('drift'), 1)),
    dust: Math.round(Math.min(MAX_DUST, Math.max(0, numberOf(read('dust'), 1) * DUST))),
    gain: Math.max(0, numberOf(read('gain'), 1)),
    pattern:
      typeof pattern === 'string' && PATTERNS.includes(pattern)
        ? (pattern as StrandsPattern)
        : 'ribbon',
    softness: share(numberOf(read('softness'), 0)),
    speed: Math.max(0, numberOf(read('speed'), 1)),
    spread: Math.max(0, numberOf(read('spread'), 1)),
  }
}

/** The palette, read off the canvas part's colors, as the web's `paletteOf` reads them. */
const paletteFrom = (look: DrawingLook): StrandsPalette => paletteOf(carriedColors(look), bytesOf)

/** The path laid in a box, kept until the box or the form changes. */
interface Laid {
  readonly key: string
  readonly count: number
  readonly lengths: Float32Array
  readonly points: Float32Array
}

const layOut = (settings: Settings, box: DrawingBox): Laid => {
  const path = boxPath(settings.pattern, settings.at, box.height, box.width)
  const points = new Float32Array(MAX_POINTS * 4)
  path.forEach((point, i) => {
    points.set(point, i * 4)
  })
  return {
    count: path.length,
    key: `${settings.pattern} ${settings.at} ${box.width} ${box.height}`,
    lengths: arcLengths(path, box.width),
    points,
  }
}

/** The clock and the path a ribbon keeps from frame to frame. */
interface Held {
  elapsed: number
  laid?: Laid
}

/** Draws one frame, `dt` seconds of motion after the last. */
const painterOf =
  (held: Held, settings: Settings, look: StrandsLook): Painter =>
  (canvas, skia, box, dt) => {
    held.elapsed += dt * PACE * settings.speed
    const key = `${settings.pattern} ${settings.at} ${box.width} ${box.height}`
    if (held.laid?.key !== key) {
      held.laid = layOut(settings, box)
    }
    const { laid } = held
    const frame: RibbonFrame = {
      contrast: settings.contrast,
      count: laid.count,
      depth: settings.depth,
      dpr: RATIO,
      drift: settings.drift,
      dust: settings.dust,
      lengths: laid.lengths,
      points: laid.points,
      range: [0, 1],
      scroll: 0,
      softness: settings.softness,
      spread: SPREAD * settings.spread,
      strands: Math.round(MIN_STRANDS + (MAX_STRANDS - MIN_STRANDS) * settings.density),
      time: held.elapsed,
      view: [box.width, box.height],
    }
    paintRibbon(canvas, skia, box, frame, look)
  }

/**
 * The band the web lays under its canvas, at 115 degrees, faded at its edges,
 * which a phone draws where it cannot draw the ribbon.
 */
const band = (palette: StrandsPalette, fade: number, clear: boolean) => (box: DrawingBox) => {
  const { Defs, G, LinearGradient, Mask, Rect, Stop, Svg } = svg()
  const { height, width } = box
  if (width <= 0 || height <= 0) {
    return null
  }
  const ground = rgbOf(palette.ground)
  const glow = rgbOf(palette.glow)
  const tint = rgbOf(palette.tint)
  const stops = clear
    ? [
        rgbOf(palette.ground, 0),
        rgbOf(palette.glow, 0.22),
        rgbOf(palette.tint, 0.12),
        rgbOf(palette.ground, 0),
      ]
    : [ground, mix(glow, 22, ground), mix(tint, 12, ground), ground]
  /* CSS measures the angle from the top, clockwise, and the line runs as far
     as the box's corners reach along it. */
  const angle = (115 * Math.PI) / 180
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)]
  const reach = (Math.abs(width * dx) + Math.abs(height * dy)) / 2
  const fades = [
    { id: 'strands-fade-y', share: fade, x2: '0', y2: '1' },
    { id: 'strands-fade-x', share: fade / 3, x2: '1', y2: '0' },
  ]
  return (
    <Svg height={height} width={width}>
      <Defs>
        <LinearGradient
          gradientUnits="userSpaceOnUse"
          id="strands-band"
          x1={width / 2 - dx * reach}
          x2={width / 2 + dx * reach}
          y1={height / 2 - dy * reach}
          y2={height / 2 + dy * reach}
        >
          {[0.2, 0.48, 0.58, 0.82].map((at, i) => (
            <Stop key={at} offset={String(at)} stopColor={stops[i] ?? ground} />
          ))}
        </LinearGradient>
        {fades.map((one) => (
          <LinearGradient id={one.id} key={one.id} x1="0" x2={one.x2} y1="0" y2={one.y2}>
            {(
              [
                ['start', 0, 0],
                ['in', one.share, 1],
                ['out', 1 - one.share, 1],
                ['end', 1, 0],
              ] as const
            ).map(([name, at, opacity]) => (
              <Stop key={name} offset={String(at)} stopColor="white" stopOpacity={opacity} />
            ))}
          </LinearGradient>
        ))}
        {fades.map((one) => (
          <Mask id={`${one.id}-mask`} key={one.id}>
            <Rect fill={`url(#${one.id})`} height={height} width={width} />
          </Mask>
        ))}
      </Defs>
      <G mask="url(#strands-fade-y-mask)">
        <Rect
          fill="url(#strands-band)"
          height={height}
          mask="url(#strands-fade-x-mask)"
          width={width}
        />
      </G>
    </Svg>
  )
}

interface DrawingProps {
  readonly drawable: boolean
  readonly look: DrawingLook
  readonly settings: Settings
}

/** The ribbon, moving on the GPU, or still, or the band. */
const StrandsDrawing = ({ drawable, look, settings }: DrawingProps) => {
  const held = useRef<Held>({ elapsed: 0 })
  const reduced = useReducedMotion()
  const paused = useMotionPaused()
  const palette = paletteFrom(look)
  const fade = fadeOf(look, 'strands-fade', 0.15)
  const strandsLook: StrandsLook = {
    bloom: settings.bloom,
    clear: settings.clear,
    fade,
    gain: settings.gain,
    palette,
  }
  return (
    <GpuDrawing
      drawable={drawable}
      fallback={band(palette, fade, settings.clear)}
      interval={1 / 30}
      paint={painterOf(held.current, settings, strandsLook)}
      running={!reduced && !paused && settings.speed > 0}
      still={`${JSON.stringify(settings)} ${palette.glow} ${palette.ground} ${palette.tint} ${palette.peak} ${fade}`}
    />
  )
}

/** Draws a ribbon of strands in its canvas part, and whether it draws or falls back. */
export const useStrands = (family: Family, props: Props, _use: MachineUse): Behavior => {
  const skia = loadSkia()
  const drawable = skia !== null && strandsEffects(skia) !== null
  const settings = settingsOf(family, props)
  return {
    marks: drawable ? ['drawing'] : ['fallback'],
    parts: {
      canvas: {
        drawing: (look) => <StrandsDrawing drawable={drawable} look={look} settings={settings} />,
      },
    },
  }
}
