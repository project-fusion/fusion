/*
 * The generated Orb on a phone. Its host says what a screen reader hears, from
 * core's derivations, as the web's says it. Without react-native-skia it draws
 * one still frame of core's dots in react-native-svg, and never requires the
 * package, whose first line throws in an app built without its module.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { TurboModuleRegistry, View } from 'react-native'
import { forgetSkia } from '../capabilities/gpu-drawing'
import { HelixTheme } from '../theme/helix-theme'
import { HelixOrb } from './orb/index.native'

const mockRequired: string[] = []

jest.mock(
  '@shopify/react-native-skia',
  () => {
    mockRequired.push('@shopify/react-native-skia')
    throw new Error("TurboModuleRegistry.getEnforcing(...): 'RNSkiaModule' could not be found")
  },
  { virtual: true },
)

/* An app built without Skia's module, where the registry answers `null` for it. */
const registered = TurboModuleRegistry.get.bind(TurboModuleRegistry)
jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation((name: string) => (name === 'RNSkiaModule' ? null : registered(name)))

let drawn: Awaited<ReturnType<typeof render>> | undefined

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  forgetSkia()
})

/** The host: the node that carries the orb's role. */
const hostOf = (tree: Awaited<ReturnType<typeof render>>) =>
  tree.container.queryAll(
    (node) =>
      typeof node.props.accessibilityRole === 'string' || typeof node.props.role === 'string',
  )[0]

/** The dots the still frame draws: each a circle with a radius. */
const dotsOf = (tree: Awaited<ReturnType<typeof render>>) =>
  tree.container.queryAll((node) => node.type === 'RNSVGCircle')

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

describe('Orb without react-native-skia', () => {
  test('is a busy progress bar named for its state, and draws a still frame of its dots', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb state="fetching" />
      </HelixTheme>,
    )
    await layOut(drawn, 48)
    const host = hostOf(drawn)
    expect(host?.props.accessibilityRole ?? host?.props.role).toBe('progressbar')
    expect(host?.props.accessibilityLabel ?? host?.props['aria-label']).toBe('Fetching')
    expect(host?.props.accessibilityState?.busy ?? host?.props['aria-busy']).toBe(true)
    expect(dotsOf(drawn).length).toBeGreaterThan(100)
    expect(mockRequired).toEqual([])
  })

  test('is an image named Done once done, not busy, and a state it does not draw is Thinking', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb state="done" />
        <HelixOrb state={'compiling' as 'thinking'} />
      </HelixTheme>,
    )
    const hosts = drawn.container.queryAll(
      (node) =>
        typeof node.props.accessibilityRole === 'string' || typeof node.props.role === 'string',
    )
    expect(hosts[0]?.props.accessibilityRole ?? hosts[0]?.props.role).toBe('image')
    expect(hosts[0]?.props.accessibilityLabel ?? hosts[0]?.props['aria-label']).toBe('Done')
    expect(hosts[0]?.props.accessibilityState?.busy ?? false).toBe(false)
    expect(hosts[1]?.props.accessibilityLabel ?? hosts[1]?.props['aria-label']).toBe('Thinking')
  })

  test('takes its label and its own words for a state', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb label="Reading report.pdf" state="working" />
        <HelixOrb state="working" stateLabels={{ working: 'Au travail' }} />
      </HelixTheme>,
    )
    const labels = drawn.container
      .queryAll((node) => typeof node.props.accessibilityLabel === 'string')
      .map((node) => node.props.accessibilityLabel)
    expect(labels).toContain('Reading report.pdf')
    expect(labels).toContain('Au travail')
  })

  test('under announce, is a status that is never busy', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb announce state="working" />
      </HelixTheme>,
    )
    const host = hostOf(drawn)
    expect(['summary', 'status']).toContain(host?.props.accessibilityRole ?? host?.props.role)
    expect(host?.props.accessibilityState?.busy ?? false).toBe(false)
  })

  test('a shape passed in hides the dots', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixOrb state="thinking">
          <View testID="own-shape" />
        </HelixOrb>
      </HelixTheme>,
    )
    await layOut(drawn, 48)
    expect(drawn.queryByTestId('own-shape')).not.toBeNull()
    expect(dotsOf(drawn)).toHaveLength(0)
  })
})
