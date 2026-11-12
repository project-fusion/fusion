/**
 * An aura on a phone: the web's own shader, run as a react-native-skia
 * runtime effect through the GPU drawing capability, on the numbers core's
 * `AuraField` keeps, and its pause control.
 *
 * **The colors are the canvas part's own**, as the web's script reads them
 * off its canvas: the glow on its `color`, the haze on its
 * `text-decoration-color`, the ground on its `outline-color`, and the peak
 * on its `caret-color` over a dark ground and its `column-rule-color` over a
 * light one, so each stop takes its hook from anywhere above the aura.
 *
 * **The top and bottom edges fade by `--aura-fade`**, eased on the stops the
 * web's mask takes, and drawn into the same layer as the field.
 *
 * **It stops as the web's paint gate stops it.** While the app pauses its
 * motion, or `paused` holds it, it keeps the frame it showed, with reduced
 * motion it draws one still frame, and while the app is in the background it
 * draws nothing new.
 *
 * **Without react-native-skia, or where the effect does not compile, it draws
 * the gradient** the web lays under its canvas, in `react-native-svg`, and
 * says `fallback`. The pointer's wake is the web's: a phone has no pointer
 * that hovers.
 */
import {
  AuraField,
  type AuraPalette,
  type AuraSettings,
  auraSkSL,
  paletteOf,
} from '@fusion.dev/helix-core/aura'
import { useEffect, useRef, useState } from 'react'
import { loadSkia } from '../capabilities/gpu-drawing'
import type { MachineUse } from '../ir.generated'
import type { Behavior, DrawingLook, Props } from '../render/behavior'
import { type DrawingBox, GpuDrawing, type Painter } from '../render/gpu-drawing'
import { useMotionPaused, useReducedMotion } from '../render/motion'
import type { SkiaModule, SkRuntimeEffect } from '../render/skia-types'
import { svg } from '../render/vector'
import { mix } from '../style/color'
import type { Family } from '../style/form'
import { colorBytes } from './orb'
import { boundTo, given, tell } from './props'

/** The effect, compiled once, or `null` where it does not compile. */
let compiled: SkRuntimeEffect | null | undefined

const effectOf = (skia: SkiaModule): SkRuntimeEffect | null => {
  compiled ??= skia.Skia.RuntimeEffect.Make(auraSkSL())
  return compiled
}

const numberOf = (value: unknown, otherwise: number): number => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : otherwise
}

const wordsOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

/** The fade `--aura-fade` sets, as a share of the height, `0.15` where it sets none. */
const fadeOf = (look: DrawingLook): number => {
  const written = String(look.custom['aura-fade'] ?? '15%').trim()
  const share = Number.parseFloat(written)
  if (!Number.isFinite(share)) {
    return 0.15
  }
  return Math.min(0.5, Math.max(0, written.endsWith('%') ? share / 100 : share))
}

/** The four stops, read off the canvas part's colors, as the web's `paletteOf` reads them. */
const paletteFrom = (look: DrawingLook): AuraPalette => {
  const box = (look.box ?? {}) as Readonly<Record<string, unknown>>
  const text = look.text as Readonly<Record<string, unknown>>
  const words = (value: unknown) => (typeof value === 'string' ? value : '')
  return paletteOf(
    {
      caretColor: words(box.caretColor),
      color: words(text.color),
      columnRuleColor: words(box.columnRuleColor),
      outlineColor: words(box.outlineColor),
      textDecorationColor: words(text.textDecorationColor),
    },
    (value) => {
      if (value === '') {
        return undefined
      }
      const [red, green, blue] = colorBytes(value)
      return [red, green, blue]
    },
  )
}

/** The mask's stops, the web's, as a share of the height and an alpha. */
const MASK = [
  [0, 0],
  [0.125, 0.04],
  [0.25, 0.16],
  [0.5, 0.5],
  [0.75, 0.84],
  [0.875, 0.96],
  [1, 1],
] as const

/** The mask's stops down the whole height, for a fade of `fade`. */
export const maskStops = (fade: number): readonly (readonly [number, number])[] => [
  ...MASK.map(([at, alpha]) => [at * fade, alpha] as const),
  ...[...MASK].reverse().map(([at, alpha]) => [1 - at * fade, alpha] as const),
]

/** A color of the palette as words. */
const rgb = (color: readonly number[]): string =>
  `rgb(${color.map((channel) => Math.round(channel * 255)).join(',')})`

/** The uniforms in the order the shader declares them, as a runtime effect takes them. */
const flat = (field: AuraField, settings: AuraSettings, palette: AuraPalette, box: DrawingBox) => {
  const frame = field.uniforms(settings, palette)
  return [
    box.width,
    box.height,
    frame.uTime,
    frame.uShape,
    ...frame.uPointer,
    frame.uReach,
    frame.uInteraction,
    frame.uTilt,
    frame.uScale,
    frame.uBloom,
    frame.uGain,
    frame.uVariance,
    ...frame.uTrail,
    ...frame.uGround,
    ...frame.uHaze,
    ...frame.uGlow,
    ...frame.uPeak,
  ]
}

/** The gradient the web lays under its canvas, which a phone draws where it cannot draw the field. */
const gradient = (palette: AuraPalette, fade: number) => (box: DrawingBox) => {
  const { Defs, LinearGradient, Mask, RadialGradient, Rect, Stop, Svg } = svg()
  const { height, width } = box
  if (width <= 0 || height <= 0) {
    return null
  }
  const ground = rgb(palette.ground)
  return (
    <Svg height={height} width={width}>
      <Defs>
        <RadialGradient
          cx={width * 0.62}
          cy={height * 0.12}
          gradientUnits="userSpaceOnUse"
          id="aura-ramp"
          rx={width * 1.2}
          ry={height * 0.9}
        >
          <Stop offset="0" stopColor={mix(rgb(palette.glow), 38, ground)} />
          <Stop offset="0.38" stopColor={rgb(palette.haze)} />
          <Stop offset="0.78" stopColor={ground} />
          <Stop offset="1" stopColor={ground} />
        </RadialGradient>
        <LinearGradient id="aura-fade" x1="0" x2="0" y1="0" y2="1">
          {maskStops(fade).map(([at, alpha]) => (
            <Stop key={at} offset={String(at)} stopColor="white" stopOpacity={alpha} />
          ))}
        </LinearGradient>
        <Mask id="aura-mask">
          <Rect fill="url(#aura-fade)" height={height} width={width} />
        </Mask>
      </Defs>
      <Rect fill="url(#aura-ramp)" height={height} mask="url(#aura-mask)" width={width} />
    </Svg>
  )
}

/** The field, drawn by the shader on the GPU, faded at its top and bottom. */
const paintField =
  (field: AuraField, settings: AuraSettings, palette: AuraPalette, fade: number): Painter =>
  (canvas, skia, box, dt) => {
    const effect = effectOf(skia)
    if (effect === null) {
      return
    }
    field.advance(dt, settings)
    const { BlendMode, Skia } = skia
    const whole = Skia.XYWHRect(0, 0, box.width, box.height)
    canvas.saveLayer()
    const fill = Skia.Paint()
    fill.setShader(effect.makeShader(flat(field, settings, palette, box)))
    canvas.drawRect(whole, fill)
    if (fade > 0) {
      const stops = maskStops(fade)
      const mask = Skia.Paint()
      mask.setBlendMode(BlendMode.DstIn ?? 0)
      mask.setShader(
        Skia.Shader.MakeLinearGradient(
          { x: 0, y: 0 },
          { x: 0, y: box.height },
          stops.map(([, alpha]) => Skia.Color(`rgba(0,0,0,${alpha})`)),
          stops.map(([at]) => at),
          skia.TileMode.Clamp ?? 0,
        ),
      )
      canvas.drawRect(whole, mask)
    }
    canvas.restore()
  }

interface FieldProps {
  readonly drawable: boolean
  readonly held: boolean
  readonly look: DrawingLook
  readonly settings: AuraSettings
}

/** The field, moving on the GPU, or still, or the gradient. */
const AuraDrawing = ({ drawable, held, look, settings }: FieldProps) => {
  const field = useRef<AuraField | null>(null)
  field.current ??= new AuraField()
  const reduced = useReducedMotion()
  const paused = useMotionPaused()
  const palette = paletteFrom(look)
  const fade = fadeOf(look)
  return (
    <GpuDrawing
      drawable={drawable}
      fallback={gradient(palette, fade)}
      paint={paintField(field.current, settings, palette, fade)}
      running={!reduced && !paused && !held}
      still={`${JSON.stringify(settings)} ${palette.glow} ${palette.ground} ${palette.haze} ${palette.peak} ${fade}`}
    />
  )
}

/** The settings a frame of the field reads, off the element's props. */
const settingsOf = (family: Family, props: Props): AuraSettings => {
  const read = (name: string) => given(family, props, name)
  const terminus = read('terminus')
  return {
    bloom: numberOf(read('bloom'), 0.5),
    drift: numberOf(read('drift'), 0),
    gain: numberOf(read('gain'), 1),
    height: 1,
    interaction: wordsOf(read('interaction')),
    interactive: false,
    pattern: wordsOf(read('pattern')),
    reach: numberOf(read('reach'), 1),
    scale: numberOf(read('scale'), 1),
    speed: numberOf(read('speed'), 1),
    terminus: terminus === undefined || terminus === '' ? undefined : numberOf(terminus, 0.5),
    tilt: numberOf(read('tilt'), 14),
    variance: Math.min(1, Math.max(0, numberOf(read('variance'), 1))),
    width: 1,
  }
}

/** Whether the field holds still: `paused` as given, until the pause control turns it. */
const useHeld = (asked: boolean) => {
  const [own, setOwn] = useState<boolean>()
  const seen = useRef(asked)
  useEffect(() => {
    if (seen.current !== asked) {
      seen.current = asked
      setOwn(undefined)
    }
  }, [asked])
  return [own ?? asked, setOwn] as const
}

/** Draws an aura: its field in its canvas part, its pause control, and whether it draws or falls back. */
export const useAura = (family: Family, props: Props, use: MachineUse): Behavior => {
  const [held, setHeld] = useHeld(given(family, props, 'paused') === true)
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const skia = loadSkia()
  const drawable = skia !== null && effectOf(skia) !== null
  const settings = settingsOf(family, props)
  const change = boundTo(use, 'onChange', 'event')
  return {
    marks: drawable ? ['drawing'] : ['fallback'],
    parts: {
      canvas: {
        drawing: (look) => (
          <AuraDrawing drawable={drawable} held={held} look={look} settings={settings} />
        ),
      },
      host: {
        states: { [flag('glyph')]: held ? 'play' : 'pause', [flag('held')]: held },
      },
      pause: {
        view: {
          onPress: () => {
            setHeld(!held)
            tell(family, props, change ?? 'change', {})
          },
        },
      },
    },
  }
}
