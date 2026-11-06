/*
 * The generated Orb where react-native-skia stands, faked here: each frame is
 * a picture of core's dots, in the ink and ground its canvas part's rules
 * resolve to, a hook a page sets among them, and it stops while the app
 * pauses its motion.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { TurboModuleRegistry, View } from 'react-native'
import { forgetSkia } from '../capabilities/gpu-drawing'
import { pauseMotion } from '../render/motion'
import { HelixTheme } from '../theme/helix-theme'
import { HelixOrb } from './orb/index.native'

/** Each circle drawn, as its fill's words, frame by frame. */
const mockFrames: string[][] = []

jest.mock(
  '@shopify/react-native-skia',
  () => {
    const { createElement } = jest.requireActual<typeof import('react')>('react')
    const native = jest.requireActual<typeof import('react-native')>('react-native')
    return {
      BlendMode: { Plus: 12 },
      Canvas: ({ children }: { children?: unknown }) =>
        createElement(native.View, { testID: 'skia-canvas' }, children as never),
      Picture: () => createElement(native.View, { testID: 'skia-picture' }),
      Skia: {
        Color: (color: string) => color,
        Paint: () => {
          const paint = {
            color: '',
            setAntiAlias: () => undefined,
            setColor: (c: string) => {
              paint.color = c
            },
          }
          return paint
        },
        PictureRecorder: () => {
          const frame: string[] = []
          return {
            beginRecording: () => ({
              drawCircle: (_x: number, _y: number, _r: number, paint: { color: string }) => {
                frame.push(paint.color)
              },
            }),
            finishRecordingAsPicture: () => {
              mockFrames.push(frame)
              return {}
            },
          }
        },
        XYWHRect: (x: number, y: number, width: number, height: number) => ({
          height,
          width,
          x,
          y,
        }),
      },
      TileMode: { Decal: 3 },
    }
  },
  { virtual: true },
)

const registered = TurboModuleRegistry.get.bind(TurboModuleRegistry)
jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation((name: string) =>
    name === 'RNSkiaModule' ? ({} as never) : registered(name),
  )

let drawn: Awaited<ReturnType<typeof render>> | undefined

beforeEach(() => {
  mockFrames.length = 0
  forgetSkia()
})

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  pauseMotion(false)
})

/** Lays the drawing out at `size` points, as a phone's layout would. */
const layOut = async (tree: Awaited<ReturnType<typeof render>>, size: number) => {
  const boxes = tree.container.queryAll(
    (node) => typeof node.props.onLayout === 'function' && node.props.pointerEvents === 'none',
  )
  await act(async () => {
    for (const box of boxes) {
      ;(box.props.onLayout as (event: unknown) => void)({
        nativeEvent: { layout: { height: size, width: size, x: 0, y: 0 } },
      })
    }
  })
}

/** Waits `ms` of real time, for frames to be drawn. */
const wait = (ms: number) => act(() => new Promise<void>((done) => setTimeout(done, ms)))

/** The red channel less the green of a color's words. */
const redness = (color: string): number => {
  const [red = 0, green = 0] = (/rgba\((\d+),(\d+)/.exec(color) ?? []).slice(1).map(Number)
  return red - green
}

describe('Orb with react-native-skia', () => {
  test('draws a picture of its dots each frame, in the ink a hook sets', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb hooks={{ color: '#ff0000', ground: '#ffffff' }} state="fetching" />
      </HelixTheme>,
    )
    await layOut(drawn, 48)
    await wait(120)
    expect(drawn.queryAllByTestId('skia-picture', { includeHiddenElements: true }).length).toBe(1)
    expect(mockFrames.length).toBeGreaterThan(2)
    const last = mockFrames.at(-1) ?? []
    expect(last.length).toBeGreaterThan(100)
    /* The nearest dot is drawn last, in the ink, and red over its green. */
    expect(redness(last.at(-1) ?? '')).toBeGreaterThan(100)
  })

  test('holds its frame while the app pauses its motion', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <View>
          <HelixOrb state="thinking" />
        </View>
      </HelixTheme>,
    )
    await layOut(drawn, 48)
    await act(async () => {
      pauseMotion(true)
    })
    await wait(30)
    const held = mockFrames.length
    await wait(120)
    expect(mockFrames.length).toBe(held)
  })
})
