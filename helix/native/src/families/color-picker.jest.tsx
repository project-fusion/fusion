import { setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { fakeClipboard } from '@fusion.dev/helix-core/capabilities/clipboard/fake'
import { afterEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ComponentProps } from 'react'
import { HelixRoot } from '../index'
import './color-picker/index.native'
import './slider/index.native'
import { HelixColorPicker } from './color-picker/index.native'

const Drawn = (props: ComponentProps<typeof HelixColorPicker>) => (
  <HelixRoot>
    <HelixColorPicker {...props} />
  </HelixRoot>
)

const moved = (name: RegExp) => screen.getByLabelText(name)

describe('HelixColorPicker', () => {
  afterEach(() => {
    setClipboard(fakeClipboard())
  })

  test('a screen reader reaches the two axes of the square, reading the color', async () => {
    await render(<Drawn value="#ff0000" />)
    expect(moved(/^Saturation$/).props.accessibilityValue.text).toContain('Saturation 100%')
    expect(moved(/^Brightness$/).props.accessibilityValue.text).toContain('Brightness 100%')
    expect(moved(/^Saturation$/).props.accessibilityValue.text).toContain('red')
  })

  test('its name comes before each channel', async () => {
    await render(<Drawn label="Brand" value="#ff0000" />)
    expect(moved(/^Brand, Hue$/)).toBeTruthy()
  })

  test('a screen reader steps an axis, asking first and settling', async () => {
    const told: string[] = []
    await render(
      <Drawn
        onBeforeChange={(event) => told.push(String(event.detail.value))}
        onChange={() => told.push('change')}
        value="#336699"
      />,
    )
    await act(async () => {
      fireEvent(moved(/^Brightness$/), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      })
    })
    expect(told).toEqual(['#33679c', 'change'])
  })

  test('the syntax toggle rewrites the value and walks on', async () => {
    const told: string[] = []
    await render(
      <Drawn onBeforeChange={(event) => told.push(String(event.detail.value))} value="#ff0000" />,
    )
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Syntax: hex. Change it.'))
    })
    expect(told).toEqual(['rgb(255, 0, 0)'])
    expect(screen.getByLabelText('Syntax: rgb. Change it.')).toBeTruthy()
  })

  test('a preset is written from its own numbers', async () => {
    const told: string[] = []
    await render(
      <Drawn
        onBeforeChange={(event) => told.push(String(event.detail.value))}
        swatches="#00aa00, nope"
        value="#ff0000"
      />,
    )
    await act(async () => {
      fireEvent.press(
        screen
          .getAllByRole('button')
          .filter((one) => /green/.test(one.props.accessibilityLabel ?? ''))[0] as never,
      )
    })
    expect(told).toEqual(['#00aa00'])
  })

  test('a number field writes its channel', async () => {
    const told: string[] = []
    await render(
      <Drawn
        channelFields
        onBeforeChange={(event) => told.push(String(event.detail.value))}
        value="#336699"
      />,
    )
    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Red'), '255')
    })
    expect(told).toEqual(['#ff6699'])
  })

  test('the sample copies the value and says so', async () => {
    const clipboard = fakeClipboard()
    setClipboard(clipboard)
    const told: string[] = []
    await render(
      <Drawn onCopy={(event) => told.push(String(event.detail.value))} value="#ff0000" />,
    )
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Copy #ff0000'))
    })
    expect(told).toEqual(['#ff0000'])
    expect(screen.getByLabelText('Copied')).toBeTruthy()
  })

  test('a ring draws in place of the hue ramp, one wedge a band', async () => {
    await render(<Drawn value="#ff0000" wheel />)
    expect(screen.queryByLabelText(/^Hue$/)).toBeTruthy()
  })
})
