/**
 * The part of `@shopify/react-native-skia` Helix's drawings use, typed here
 * so the package stays an optional peer: an app that draws no GPU family
 * installs nothing, and helix/native builds without it.
 *
 * **Each name is the package's own**, as its 2.x line exports it, so a
 * drawing reads as Skia's documentation does.
 */
import type { ComponentType, ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

/** A color as Skia takes it: four floats, `0` to `1`. */
export type SkColor = Float32Array

/** A rectangle. */
export interface SkRect {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

/** A shader a paint fills with. */
export type SkShader = object

/** An image filter a paint draws through, such as a blur. */
export type SkImageFilter = object

/** A paint: a fill, its color or shader, and how it blends. */
export interface SkPaint {
  setAlphaf(alpha: number): void
  setAntiAlias(on: boolean): void
  setBlendMode(mode: number): void
  setColor(color: SkColor): void
  setImageFilter(filter: SkImageFilter | null): void
  setShader(shader: SkShader | null): void
}

/** A path of lines and curves. */
export interface SkPath {
  close(): SkPath
  lineTo(x: number, y: number): SkPath
  moveTo(x: number, y: number): SkPath
}

/** A canvas a picture is recorded on. */
export interface SkCanvas {
  drawCircle(cx: number, cy: number, radius: number, paint: SkPaint): void
  drawPaint(paint: SkPaint): void
  drawPath(path: SkPath, paint: SkPaint): void
  drawRect(rect: SkRect, paint: SkPaint): void
  restore(): void
  saveLayer(paint?: SkPaint): number
}

/** A recorded drawing, which the `Picture` component draws. */
export type SkPicture = object

/** Records drawing calls into a picture. */
export interface SkPictureRecorder {
  beginRecording(bounds: SkRect): SkCanvas
  finishRecordingAsPicture(): SkPicture
}

/** A compiled SkSL program a shader is made from. */
export interface SkRuntimeEffect {
  makeShader(uniforms: readonly number[]): SkShader
}

/** Skia's factory, the package's `Skia`. */
export interface SkiaApi {
  Color(color: string): SkColor
  ImageFilter: {
    MakeBlur(x: number, y: number, mode: number, input: SkImageFilter | null): SkImageFilter
  }
  Paint(): SkPaint
  Path: { Make(): SkPath }
  PictureRecorder(): SkPictureRecorder
  RuntimeEffect: { Make(source: string): SkRuntimeEffect | null }
  XYWHRect(x: number, y: number, width: number, height: number): SkRect
}

/** What a drawing loads of the package. */
export interface SkiaModule {
  /** Skia's blend modes, by name, as `BlendMode.Plus`. */
  readonly BlendMode: Readonly<Record<string, number>>
  readonly Canvas: ComponentType<{
    readonly children?: ReactNode
    readonly style?: StyleProp<ViewStyle>
  }>
  readonly Picture: ComponentType<{ readonly picture: SkPicture }>
  readonly Skia: SkiaApi
  /** How a blur treats the edge of what it blurs, by name, as `TileMode.Decal`. */
  readonly TileMode: Readonly<Record<string, number>>
}
