/*
 * The generated Strands on a phone. With react-native-skia it lays core's
 * strands as strips of vertices, adds them into a layer, blooms the layer and
 * composites it over the ground with the web's arithmetic, faded at its
 * edges. Without it, it draws the web's band in react-native-svg and never
 * requires the package.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { TurboModuleRegistry } from 'react-native'
import { forgetSkia } from '../capabilities/gpu-drawing'
import { HelixTheme } from '../theme/helix-theme'
import { HelixStrands } from './strands/index.native'

/** What the fake package was asked to make and to draw. */
const mockMade: {
  blends: number[]
  builders: Record<string, number[]>[]
  layers: number[]
  sources: string[]
  vertices: { colors: unknown; mode: number; positions: number; textures: number }[]
} = { blends: [], builders: [], layers: [], sources: [], vertices: [] }
let mockSkia = true

jest.mock(
  '@shopify/react-native-skia',
  () => {
    const { createElement } = jest.requireActual<typeof import('react')>('react')
    const native = jest.requireActual<typeof import('react-native')>('react-native')
    const paint = () => ({
      setBlendMode: (mode: number) => {
        mockMade.blends.push(mode)
      },
      setImageFilter: () => undefined,
      setShader: () => undefined,
    })
    return {
      BlendMode: { Dst: 2, DstIn: 6, Modulate: 13, Plus: 12 },
      Canvas: ({ children }: { children?: unknown }) =>
        createElement(native.View, { testID: 'skia-canvas' }, children as never),
      Picture: () => createElement(native.View, { testID: 'skia-picture' }),
      Skia: {
        Color: (color: string) => color,
        ImageFilter: {
          MakeArithmetic: () => ({}),
          MakeBlur: () => ({}),
          MakeRuntimeShader: () => ({}),
        },
        MakeVertices: (
          mode: number,
          positions: unknown[],
          textures: unknown[] | null,
          colors: unknown,
        ) => {
          mockMade.vertices.push({
            colors,
            mode,
            positions: positions.length,
            textures: textures?.length ?? 0,
          })
          return {}
        },
        Paint: paint,
        PictureRecorder: () => ({
          beginRecording: () => ({
            drawRect: () => undefined,
            drawVertices: () => undefined,
            restore: () => undefined,
            save: () => 0,
            saveLayer: (_paint: unknown, _bounds: unknown, _backdrop: unknown, flags?: number) => {
              mockMade.layers.push(flags ?? 0)
              return 0
            },
            scale: () => undefined,
          }),
          finishRecordingAsPicture: () => ({}),
        }),
        RuntimeEffect: {
          Make: (source: string) => {
            mockMade.sources.push(source)
            return { makeShader: () => ({}) }
          },
        },
        RuntimeShaderBuilder: () => {
          const set: Record<string, number[]> = {}
          mockMade.builders.push(set)
          return {
            setUniform: (name: string, value: number[]) => {
              set[name] = [...value]
            },
          }
        },
        Shader: { MakeLinearGradient: () => ({}) },
        XYWHRect: (x: number, y: number, width: number, height: number) => ({
          height,
          width,
          x,
          y,
        }),
      },
      TileMode: { Clamp: 0, Decal: 3 },
      VertexMode: { TriangleStrip: 1, Triangles: 0 },
    }
  },
  { virtual: true },
)

const registered = TurboModuleRegistry.get.bind(TurboModuleRegistry)
jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation((name: string) =>
    name === 'RNSkiaModule' ? (mockSkia ? ({} as never) : null) : registered(name),
  )

let drawn: Awaited<ReturnType<typeof render>> | undefined

/* **The clock is the test's**, and what the fake package made is cleared:
   the frames a drawing asks for are drawn only when a test moves the clock,
   so a busy machine draws the same frames and nothing leaks between tests. */
beforeEach(() => {
  for (const list of Object.values(mockMade)) {
    list.length = 0
  }
  mockSkia = true
  jest.useFakeTimers()
})

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  forgetSkia()
  jest.useRealTimers()
})

/** Moves the clock on by `ms`, a frame at a time, and draws what the frames ask for. */
const frames = (ms: number) =>
  act(async () => {
    for (let at = 0; at < ms; at += 16) {
      jest.advanceTimersByTime(16)
    }
  })

/** Lays the drawing out at `width` by `height` points, as a phone's layout would. */
const layOut = async (tree: Awaited<ReturnType<typeof render>>, width: number, height: number) => {
  const boxes = tree.container.queryAll(
    (node) => typeof node.props.onLayout === 'function' && node.props.pointerEvents === 'none',
  )
  await act(async () => {
    for (const box of boxes) {
      ;(box.props.onLayout as (event: unknown) => void)({
        nativeEvent: { layout: { height, width, x: 0, y: 0 } },
      })
    }
  })
}

describe('Strands with react-native-skia', () => {
  test('adds its strands as strips and its dust as specks, then composites them over the ground', async () => {
    drawn = await render(
      <HelixTheme mode="dark">
        <HelixStrands density={0} dust={0.1} pattern="bend" />
      </HelixTheme>,
    )
    await layOut(drawn, 320, 200)
    await frames(100)
    expect(drawn.queryAllByTestId('skia-picture', { includeHiddenElements: true })).toHaveLength(1)
    /* The strands' profile, the specks', and the composite, each compiled once. */
    expect(mockMade.sources).toHaveLength(3)
    expect(mockMade.sources.some((source) => source.includes('uniform shader scene'))).toBe(true)
    /* The first frame: its strips, then its specks. Later frames repeat it. */
    const specksAt = mockMade.vertices.findIndex((one) => one.colors !== null)
    const strips = mockMade.vertices.slice(0, specksAt)
    const specks = mockMade.vertices.filter((one) => one.colors !== null)
    expect(strips.length).toBeGreaterThan(0)
    expect(strips.every((one) => one.mode === 1 && one.textures === one.positions)).toBe(true)
    /* Sixty strands at a density of 0, 65 stations of two vertices each, a
       strip of them joined by two vertices between each strand and the next. */
    const vertices = strips.reduce((sum, one) => sum + one.positions, 0)
    expect(vertices).toBe(60 * 65 * 2 + (60 - strips.length) * 2)
    /* Sixty specks at a dust of 0.1, four vertices each, joined by two. */
    expect(specks[0]?.positions).toBe(60 * 4 + 59 * 2)
    expect(mockMade.blends).toContain(12)
    expect(mockMade.blends).toContain(6)
    const composite = mockMade.builders.at(-1) ?? {}
    /* A dark page adds light; the default theme's ground is near black. */
    expect(composite.uLight).toEqual([0])
    expect(composite.uClear).toEqual([0])
    expect(composite.uGain?.[0]).toBeCloseTo(1.615)
    /* The light is added in half floats, as the web adds it. */
    expect(mockMade.layers).toContain(16)
  })

  test('clear composites the light without the ground, and a light page turns it to ink', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixStrands clear />
      </HelixTheme>,
    )
    await layOut(drawn, 320, 200)
    await frames(100)
    expect(mockMade.builders.length).toBeGreaterThan(0)
    const composite = mockMade.builders.at(-1) ?? {}
    expect(composite.uClear).toEqual([1])
    expect(composite.uLight).toEqual([1])
  })
})

describe('Strands without react-native-skia', () => {
  test('draws the band under its canvas, faded at its edges', async () => {
    mockSkia = false
    drawn = await render(
      <HelixTheme mode="light">
        <HelixStrands />
      </HelixTheme>,
    )
    await layOut(drawn, 320, 200)
    const gradients = drawn.container.queryAll((node) => node.type === 'RNSVGLinearGradient')
    /* The band, and the two fades. */
    expect(gradients.length).toBe(3)
    expect(drawn.container.queryAll((node) => node.type === 'RNSVGMask').length).toBe(2)
  })
})
