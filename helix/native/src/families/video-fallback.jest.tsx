/*
 * The generated Video in an app without expo-video: it draws its poster and
 * says, as an alert, that the video cannot be played, in the words of
 * `error-text`, and draws no controls that would do nothing.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, render } from '@testing-library/react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixVideo } from './video/index.native'

jest.mock('expo-video', () => {
  throw new Error('expo-video is not installed')
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
    expect(alert.length).toBeGreaterThan(0)
    expect(drawn.queryByText('This video cannot be played here')).not.toBeNull()
    expect(drawn.container.queryAll((node) => node.props.accessibilityLabel === 'Play')).toHaveLength(0)
    const stills = drawn.container.queryAll(
      (node) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri?: string }).uri === 'https://example.com/still.jpg',
    )
    expect(stills.length).toBeGreaterThan(0)
  })
})
