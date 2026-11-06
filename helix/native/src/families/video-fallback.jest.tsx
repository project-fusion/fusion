/*
 * The generated Video in an app built without expo-video's native module: it
 * draws its poster and says, as an alert, that the video cannot be played, in
 * the words of `error-text`, and draws no controls that would do nothing. It
 * never requires the package, whose first line throws there, and which React
 * Native reports as fatal even inside a `try`.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixVideo } from './video/index.native'

const mockRequired: string[] = []

jest.mock('expo', () => {
  const actual = jest.requireActual<Record<string, unknown>>('expo')
  const optional = actual.requireOptionalNativeModule as (mockName: string) => unknown
  return {
    ...actual,
    requireOptionalNativeModule: (mockName: string) =>
      mockName === 'ExpoVideo' ? null : optional(mockName),
  }
})

jest.mock('expo-video', () => {
  mockRequired.push('expo-video')
  throw new Error("Cannot find native module 'ExpoVideo'")
})

let drawn: Awaited<ReturnType<typeof render>> | undefined

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
})

describe('Video without expo-video', () => {
  test('draws its poster and an alert in the words of error-text, and no bar', async () => {
    drawn = await render(
      <HelixTheme mode="light">
        <HelixVideo
          errorText="This video cannot be played here"
          label="Product walkthrough"
          poster="https://example.com/still.jpg"
          src="https://example.com/clip.mp4"
        />
      </HelixTheme>,
    )
    await act(() => new Promise<void>((done) => setTimeout(done, 40)))
    const alert = drawn.container.queryAll(
      (node) => node.props.accessibilityRole === 'alert' || node.props.role === 'alert',
    )
    expect(mockRequired).toEqual([])
    expect(alert.length).toBeGreaterThan(0)
    expect(drawn.queryByText('This video cannot be played here')).not.toBeNull()
    expect(
      drawn.container.queryAll((node) => node.props.accessibilityLabel === 'Play'),
    ).toHaveLength(0)
    const stills = drawn.container.queryAll(
      (node) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri?: string }).uri === 'https://example.com/still.jpg',
    )
    expect(stills.length).toBeGreaterThan(0)
  })
})
