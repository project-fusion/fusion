/**
 * A drawing on the GPU through react-native-skia, the GPU drawing
 * capability's optional peer: a family hands it a painter, and it records
 * each frame the painter draws as a Skia picture and shows it.
 *
 * **It runs while it is asked to and the app is in front**, one frame a
 * screen refresh, with each frame's step clamped as the web's paint gate
 * clamps it, so a family's clock never leaps after a stall. Asked to stand,
 * it draws one frame, and again whenever its box or `still` changes, as a
 * still web canvas paints again when its colors change.
 *
 * **Without the peer it draws the family's fallback**, which a family draws
 * still and in the same box, so the app keeps its layout and a screen reader
 * hears what the family's host says, which never comes from the drawing.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { AppState, type LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { loadSkia } from '../capabilities/gpu-drawing'
import type { SkCanvas, SkiaModule, SkPicture } from './skia-types'

/** The box a drawing fills, in points. */
export interface DrawingBox {
  readonly height: number
  readonly width: number
}

/** Draws one frame on `canvas`, `dt` seconds after the one before, in a box `box` points across. */
export type Painter = (canvas: SkCanvas, skia: SkiaModule, box: DrawingBox, dt: number) => void

/** The longest step one frame reports, in seconds, as the web's paint gate clamps it. */
const MAX_STEP = 0.05

/** What a drawing is told by the family that draws it. */
export interface GpuDrawingProps {
  /** What it draws without the peer, in its box: one still frame, or nothing. */
  readonly fallback: (box: DrawingBox) => ReactNode
  /** Draws each frame. */
  readonly paint: Painter
  /** Whether it runs a frame a refresh, or stands on one frame. */
  readonly running: boolean
  /** Anything whose change draws a standing frame again, as new colors do. */
  readonly still?: unknown
}

/** Whether the app is in front, where a frame is worth drawing. */
const useInFront = (): boolean => {
  const [front, setFront] = useState(AppState.currentState !== 'background')
  useEffect(() => {
    const heard = AppState.addEventListener('change', (state) => {
      setFront(state === 'active')
    })
    return () => heard.remove()
  }, [])
  return front
}

/** Records one frame of `paint` as a picture. */
const record = (skia: SkiaModule, paint: Painter, box: DrawingBox, dt: number): SkPicture => {
  const recorder = skia.Skia.PictureRecorder()
  const canvas = recorder.beginRecording(skia.Skia.XYWHRect(0, 0, box.width, box.height))
  paint(canvas, skia, box, dt)
  return recorder.finishRecordingAsPicture()
}

/** The frames a drawing shows while the peer stands: one a refresh while running, or one. */
const useFrames = (
  skia: SkiaModule,
  { paint, running, still }: GpuDrawingProps,
  box: DrawingBox | undefined,
): SkPicture | undefined => {
  const [picture, setPicture] = useState<SkPicture>()
  const painter = useRef(paint)
  painter.current = paint
  const front = useInFront()
  const runs = running && front && box !== undefined
  // biome-ignore lint/correctness/useExhaustiveDependencies: a change of `still` draws the standing frame again.
  useEffect(() => {
    if (box === undefined) {
      return
    }
    if (!runs) {
      setPicture(record(skia, painter.current, box, 0))
      return
    }
    let last = Date.now()
    let frame = 0
    const tick = () => {
      const now = Date.now()
      const dt = Math.min(MAX_STEP, (now - last) / 1000)
      last = now
      setPicture(record(skia, painter.current, box, dt))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [box, runs, skia, still])
  return picture
}

/** The drawing, once the peer is loaded. */
const Drawn = ({ skia, ...props }: GpuDrawingProps & { readonly skia: SkiaModule }) => {
  const [box, setBox] = useState<DrawingBox>()
  const picture = useFrames(skia, props, box)
  const { Canvas, Picture } = skia
  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { height, width } = event.nativeEvent.layout
        setBox((was) => (was?.height === height && was?.width === width ? was : { height, width }))
      }}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {box === undefined || picture === undefined ? null : (
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      )}
    </View>
  )
}

/** The fallback, in the same box. */
const Fallback = ({ fallback }: Pick<GpuDrawingProps, 'fallback'>) => {
  const [box, setBox] = useState<DrawingBox>()
  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        const { height, width } = event.nativeEvent.layout
        setBox((was) => (was?.height === height && was?.width === width ? was : { height, width }))
      }}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {box === undefined ? null : fallback(box)}
    </View>
  )
}

/** Draws `paint` on the GPU where react-native-skia stands, and `fallback` where it does not. */
export const GpuDrawing = (props: GpuDrawingProps) => {
  const skia = loadSkia()
  return skia === null ? <Fallback fallback={props.fallback} /> : <Drawn {...props} skia={skia} />
}
