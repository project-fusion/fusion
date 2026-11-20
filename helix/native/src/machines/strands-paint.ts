/**
 * A phone's ribbon of strands, drawn through react-native-skia the way the
 * web's pipeline draws it: each strand's strip added into a layer, the layer
 * bloomed at two widths, and the light composited over the ground by the
 * web's own arithmetic, then faded at the edges.
 *
 * **The strips are core's `ribbonMesh`**, laid on the CPU, since a runtime
 * effect has no vertex stage. A strip's texture coordinates carry how far
 * across the strand a vertex stands and the light it carries, and a runtime
 * effect turns them into the web's Gaussian, in each strand's color.
 *
 * **The layer is half float**, as the web's buffers are, so a bend's light
 * sums past `1` and the faintest strands and the bloom's edge keep their
 * gradation. An eight bit layer clipped the one and drew the other in steps.
 * Skia keeps a half float layer in linear light, so what a strand writes is
 * encoded for the layer to decode back to the light it carries, and the
 * composite's color is decoded for the screen to encode back.
 *
 * **Drawn in the screen's own pixels.** A runtime image filter takes no
 * scale, so Skia draws a layer it filters at one pixel a point and stretches
 * it, which broke a fine strand into a stair of steps. The layer is drawn
 * unscaled, with every length in pixels, and placed back at the end.
 */
import {
  type RibbonFrame,
  type RibbonStrip,
  ribbonColors,
  ribbonMesh,
  type StrandsPalette,
} from '@fusion.dev/helix-core/strands'
import { PixelRatio } from 'react-native'
import type { DrawingBox } from '../render/gpu-drawing'
import type {
  SkCanvas,
  SkImageFilter,
  SkiaModule,
  SkPoint,
  SkRuntimeEffect,
} from '../render/skia-types'

/** The light's strength into the composite, the web renderer's `GAIN`. */
const GAIN = 1.615

/** How much the two levels of glow add, the web renderer's `BLOOM`. */
const BLOOM = 0.75

/** Skia's flag for a layer of half floats. */
const HALF_FLOAT = 16

/**
 * The bloom's two widths, in points: the web's quarter and twelfth buffers,
 * each blurred twice by its nine-tap Gaussian, come to these at the web's
 * drawing ratio on a screen of two or more pixels a point.
 */
const NEAR_SIGMA = 10
const FAR_SIGMA = 32

/** The stations a strand is laid across, over what the box shows of the path. */
export const SEGMENTS = 64

/** A strand's profile across it, in its color: the web's line fragment shader. */
const PROFILE = `uniform float3 uColor;
half4 main(float2 p) {
  float g = exp(-0.5 * p.x * p.x) * p.y;
  return half4(fromLinearSrgb(half3(uColor * g)), 1.0);
}`

/**
 * A speck's round profile, which its vertices' colors tint: the web's dust
 * fragment shader. Encoded as the colors are, so the layer decodes their
 * product to about the light times the profile.
 */
const SPECK = `half4 main(float2 p) {
  return half4(fromLinearSrgb(half3(exp(-4.0 * dot(p, p)))), 1.0);
}`

/** The light over the ground: the web's composite fragment shader, with its bloom already added. */
const COMPOSITE = `uniform shader scene;
uniform float3 uGround;
uniform float3 uInk;
uniform float uLight;
uniform float uShade;
uniform float uClear;
uniform float uGain;
float hash(float2 p) { return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }
half4 main(float2 p) {
  float3 e = float3(scene.eval(p).rgb) * uGain;
  float3 dark = 1.0 - (1.0 - uGround) * exp(-e);
  float lum = dot(e, float3(0.3, 0.55, 0.15));
  float ink = 1.0 - exp(-lum * 2.4);
  float3 hue = e / max(max(max(e.r, e.g), e.b), 1e-4);
  float3 pen = mix(hue * uShade, uInk, ink * ink);
  float3 light = mix(uGround, pen, ink);
  float3 c = mix(dark, light, uLight);
  float a = 1.0;
  if (uClear > 0.5) {
    float3 shine = 1.0 - exp(-e);
    a = mix(max(max(shine.r, shine.g), shine.b), ink, uLight);
    c = mix(shine, pen * ink, uLight);
  }
  c = clamp(c + (hash(p) - 0.5) / 255.0 * a, 0.0, a);
  return half4(half3(c), half(a));
}`

/** The three effects, compiled once, or `null` where any does not compile. */
interface Effects {
  readonly composite: SkRuntimeEffect
  readonly profile: SkRuntimeEffect
  readonly speck: SkRuntimeEffect
}

let compiled: Effects | null | undefined

export const strandsEffects = (skia: SkiaModule): Effects | null => {
  if (compiled === undefined) {
    /* Called on the factory, which a host function needs as its receiver. */
    const make = (source: string) => skia.Skia.RuntimeEffect.Make(source)
    const composite = make(COMPOSITE)
    const profile = make(PROFILE)
    const speck = make(SPECK)
    compiled = composite && profile && speck ? { composite, profile, speck } : null
  }
  return compiled
}

/** Linear light as the sRGB curve encodes it, clamped to what a vertex color holds. */
const encoded = (linear: number): number => {
  const value = Math.min(1, Math.max(0, linear))
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
}

/** Pairs of numbers as Skia's points, times `by`. */
const pointsOf = (flat: readonly number[], by = 1): SkPoint[] => {
  const out: SkPoint[] = []
  for (let i = 0; i < flat.length; i += 2) {
    out.push({ x: (flat[i] ?? 0) * by, y: (flat[i + 1] ?? 0) * by })
  }
  return out
}

/** What a frame of the painter reads beyond the ribbon. */
export interface StrandsLook {
  readonly bloom: number
  readonly clear: boolean
  /** How far the top and bottom fade, as a share of the height; the sides fade a third as far. */
  readonly fade: number
  readonly gain: number
  readonly palette: StrandsPalette
}

/** The bloom and the composite, as one filter the layer of light is drawn through. */
const compositeOf = (
  skia: SkiaModule,
  effects: Effects,
  look: StrandsLook,
  ratio: number,
): SkImageFilter => {
  const { ImageFilter } = skia.Skia
  const decal = skia.TileMode.Decal ?? 3
  const glow = BLOOM * look.bloom
  const near = ImageFilter.MakeBlur(NEAR_SIGMA * ratio, NEAR_SIGMA * ratio, decal, null)
  const far = ImageFilter.MakeBlur(FAR_SIGMA * ratio, FAR_SIGMA * ratio, decal, null)
  const nearer = ImageFilter.MakeArithmetic(0, 1.1 * glow, 1, 0, false, null, near)
  const bloomed = ImageFilter.MakeArithmetic(0, 0.9 * glow, 1, 0, false, nearer, far)
  const { palette } = look
  const builder = skia.Skia.RuntimeShaderBuilder(effects.composite)
  builder.setUniform('uGround', palette.ground)
  builder.setUniform('uInk', palette.peak)
  builder.setUniform('uLight', [palette.light ? 1 : 0])
  builder.setUniform('uShade', [Math.max(...palette.glow)])
  builder.setUniform('uClear', [look.clear ? 1 : 0])
  builder.setUniform('uGain', [GAIN * look.gain])
  return ImageFilter.MakeRuntimeShader(builder, 'scene', bloomed)
}

/** Draws the strips and the dust, added into the layer the canvas holds. */
const drawLight = (
  canvas: SkCanvas,
  skia: SkiaModule,
  effects: Effects,
  strips: readonly RibbonStrip[],
  dust: RibbonStrip & { readonly light: readonly number[] },
  palette: StrandsPalette,
  ratio: number,
) => {
  const { BlendMode, Skia } = skia
  const strip = skia.VertexMode?.TriangleStrip ?? 1
  const plus = BlendMode.Plus ?? 12
  const colors = ribbonColors(palette)
  strips.forEach((one, k) => {
    if (one.positions.length === 0) {
      return
    }
    const paint = Skia.Paint()
    paint.setBlendMode(plus)
    paint.setShader(effects.profile.makeShader([...(colors.strands[k] ?? palette.glow)]))
    const vertices = Skia.MakeVertices(
      strip,
      pointsOf(one.positions, ratio),
      pointsOf(one.profile),
      null,
      null,
      true,
    )
    canvas.drawVertices(vertices, BlendMode.Dst ?? 2, paint)
  })
  if (dust.positions.length > 0) {
    const [red = 0, green = 0, blue = 0] = colors.dust
    const paint = Skia.Paint()
    paint.setBlendMode(plus)
    paint.setShader(effects.speck.makeShader([]))
    const tints = dust.light.map((light) => [
      encoded(red * light),
      encoded(green * light),
      encoded(blue * light),
      1,
    ])
    const vertices = Skia.MakeVertices(
      strip,
      pointsOf(dust.positions, ratio),
      pointsOf(dust.profile),
      tints,
      null,
      true,
    )
    canvas.drawVertices(vertices, BlendMode.Modulate ?? 13, paint)
  }
}

/** Fades the layer the canvas holds at its edges, as the web's two masks do together. */
const fadeEdges = (canvas: SkCanvas, skia: SkiaModule, box: DrawingBox, fade: number) => {
  if (fade <= 0) {
    return
  }
  const { BlendMode, Skia } = skia
  const clamp = skia.TileMode.Clamp ?? 0
  const whole = Skia.XYWHRect(0, 0, box.width, box.height)
  const stops = (share: number) => [0, share, 1 - share, 1]
  const alphas = [0, 1, 1, 0].map((alpha) => Skia.Color(`rgba(0,0,0,${alpha})`))
  for (const [end, share] of [
    [{ x: 0, y: box.height }, fade],
    [{ x: box.width, y: 0 }, fade / 3],
  ] as const) {
    const mask = Skia.Paint()
    mask.setBlendMode(BlendMode.DstIn ?? 6)
    mask.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, end, alphas, stops(share), clamp))
    canvas.drawRect(whole, mask)
  }
}

/** Draws one frame of the ribbon `frame` describes, in a box `box` points across. */
export const paintRibbon = (
  canvas: SkCanvas,
  skia: SkiaModule,
  box: DrawingBox,
  frame: RibbonFrame,
  look: StrandsLook,
): void => {
  const effects = strandsEffects(skia)
  if (effects === null) {
    return
  }
  const { Skia } = skia
  const ratio = PixelRatio.get()
  const pixels = { height: box.height * ratio, width: box.width * ratio }
  const whole = Skia.XYWHRect(0, 0, pixels.width, pixels.height)
  const mesh = ribbonMesh(frame, SEGMENTS)
  canvas.save()
  canvas.scale(1 / ratio, 1 / ratio)
  canvas.saveLayer(undefined, whole)
  const light = Skia.Paint()
  light.setImageFilter(compositeOf(skia, effects, look, ratio))
  canvas.saveLayer(light, whole, null, HALF_FLOAT)
  drawLight(canvas, skia, effects, mesh.strips, mesh.dust, look.palette, ratio)
  canvas.restore()
  fadeEdges(canvas, skia, pixels, look.fade)
  canvas.restore()
  canvas.restore()
}
