/*
 * The generated Aura on a phone. With react-native-skia it runs the web's
 * shader as a runtime effect, on core's field and the canvas part's colors,
 * faded at its edges. Without it, it draws the web's gradient in
 * react-native-svg and never requires the package. Its pause control is a
 * toggle that holds the field and says `change`.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TurboModuleRegistry } from 'react-native'
import { forgetSkia } from '../capabilities/gpu-drawing'
import { HelixTheme } from '../theme/helix-theme'
import { HelixAura } from './aura/index.native'

/** What the fake effect was given, and what each frame drew. */
const mockMade: { sources: string[]; uniforms: number[][]; blends: number[] } = {
  blends: [],
  sources: [],
  uniforms: [],
}
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
      setShader: () => undefined,
    })
    return {
      BlendMode: { DstIn: 6 },
      Canvas: ({ children }: { children?: unknown }) =>
        createElement(native.View, { testID: 'skia-canvas' }, children as never),
      Picture: () => createElement(native.View, { testID: 'skia-picture' }),
      Skia: {
        Color: (color: string) => color,
        Paint: paint,
        PictureRecorder: () => ({
          beginRecording: () => ({
            drawRect: () => undefined,
            restore: () => undefined,
            saveLayer: () => 0,
          }),
          finishRecordingAsPicture: () => ({}),
        }),
        RuntimeEffect: {
          Make: (source: string) => {
            mockMade.sources.push(source)
            return {
              makeShader: (uniforms: number[]) => {
                mockMade.uniforms.push(uniforms)
                return {}
              },
            }
          },
        },
        Shader: { MakeLinearGradient: () => ({}) },
        XYWHRect: (x: number, y: number, width: number, height: number) => ({
          height,
          width,
          x,
          y,
        }),
      },
      TileMode: { Clamp: 0 },
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

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  forgetSkia()
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

describe('Aura with react-native-skia', () => {
  test('runs the web shader as a runtime effect, on the uniforms it declares, faded at its edges', async () => {
    drawn = await render(
      <HelixTheme mode="dark">
        <HelixAura pattern="rays" />
      </HelixTheme>,
    )
    await layOut(drawn, 320, 200)
    /* The first frame is recorded after the layout, on a loaded machine a little later. */
    await waitFor(() =>
      expect(drawn?.queryAllByTestId('skia-picture', { includeHiddenElements: true })).toHaveLength(
        1,
      ),
    )
    expect(mockMade.sources.length).toBe(1)
    expect(mockMade.sources[0]).toContain('vec4 main(vec2 fragCoord)')
    expect(mockMade.sources[0]).not.toContain('gl_FragCoord')
    const uniforms = mockMade.uniforms.at(-1) ?? []
    /* 2 + 1 + 1 + 2 + 1 + 1 + 5 + 27 + 4 * 3. */
    expect(uniforms).toHaveLength(52)
    expect(uniforms.slice(0, 2)).toEqual([320, 200])
    /* `rays` is the shader's second shape. */
    expect(uniforms[3]).toBe(1)
    expect(mockMade.blends).toContain(6)
  })
})

describe('Aura without react-native-skia', () => {
  test('draws the gradient under its canvas, and the pause control holds the field and says change', async () => {
    mockSkia = false
    const change = jest.fn()
    drawn = await render(
      <HelixTheme mode="light">
        <HelixAura onChange={change} pauseControl />
      </HelixTheme>,
    )
    await layOut(drawn, 320, 200)
    expect(
      drawn.container.queryAll((node) => node.type === 'RNSVGRadialGradient').length,
    ).toBeGreaterThan(0)
    const pause = screen.getByLabelText('Pause the motion')
    expect(
      pause.props.accessibilityState?.checked ??
        pause.props.accessibilityState?.selected ??
        pause.props['aria-pressed'] ??
        false,
    ).toBeFalsy()
    await act(async () => {
      fireEvent.press(pause)
    })
    expect(change).toHaveBeenCalledTimes(1)
    const pressed = screen.getByLabelText('Pause the motion')
    expect(
      pressed.props.accessibilityState?.checked ??
        pressed.props.accessibilityState?.selected ??
        pressed.props['aria-pressed'],
    ).toBe(true)
  })
})
