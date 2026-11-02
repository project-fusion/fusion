import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ComponentProps } from 'react'
import { HelixRoot } from '../index'
import { HelixColorInput } from './color-input/index.native'
import './color-picker/index.native'
import './slider/index.native'

const Drawn = (props: ComponentProps<typeof HelixColorInput>) => (
  <HelixRoot>
    <HelixColorInput {...props} />
  </HelixRoot>
)

describe('HelixColorInput', () => {
  test('the trigger opens the picker on the color the field holds', async () => {
    await render(<Drawn value="#ff0000" />)
    expect(screen.queryByLabelText('Saturation')).toBeNull()
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Choose a color'))
    })
    expect(screen.getByLabelText('Saturation').props.accessibilityValue.text).toContain('red')
  })

  test('a move in the picker is an edit of the text, and a refusal keeps it', async () => {
    const told: string[] = []
    let refuses = false
    await render(
      <Drawn
        defaultOpen
        defaultValue="#336699"
        onBeforeChange={(event) => {
          told.push(String(event.detail.value))
          if (refuses) {
            event.preventDefault()
          }
        }}
        onChange={() => told.push('change')}
      />,
    )
    const step = async () => {
      await act(async () => {
        fireEvent(screen.getByLabelText('Brightness'), 'accessibilityAction', {
          nativeEvent: { actionName: 'increment' },
        })
      })
    }
    await step()
    expect(told).toEqual(['#33679c', 'change'])
    refuses = true
    told.length = 0
    await step()
    expect(told).toHaveLength(1)
    expect(screen.getByLabelText('Brightness').props.accessibilityValue.now).toBe(61)
  })

  test('text that is no color is reported once the reader leaves', async () => {
    await render(<Drawn label="Brand" />)
    const field = screen.getByLabelText('Brand')
    await act(async () => {
      fireEvent(field, 'focus')
      fireEvent.changeText(field, 'nope')
      fireEvent(field, 'blur')
    })
    expect(screen.getByText(/Enter a color/)).toBeTruthy()
  })

  test('a read-only field does not open its picker', async () => {
    await render(<Drawn readonly value="#ff0000" />)
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Choose a color'))
    })
    expect(screen.queryByLabelText('Saturation')).toBeNull()
  })
})
