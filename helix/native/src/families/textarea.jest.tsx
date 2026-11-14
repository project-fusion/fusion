/*
 * The generated Textarea, drawn from its real intermediate form: a multiline
 * TextInput `rows` lines tall, one that grows with its text to `max-rows`
 * lines under `auto-grow`, an edit that asks first, the clear button, and
 * the message that takes the hint's place. `test:native` writes the
 * component beside this file.
 */
import { beforeEach, describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixTextarea, type HelixTextareaProps } from './textarea/index.native'

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
})

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } }) =>
  StyleSheet.flatten(view.props.style as never) as Readonly<Record<string, unknown>>

/** The one field a reader types into, which every spec here names. */
const field = () => {
  const found = screen.getAllByLabelText(/./).find((node) => node.type === 'TextInput')
  if (found === undefined) {
    throw new Error('no field is drawn')
  }
  return found
}

const Textarea = (props: HelixTextareaProps) => (
  <HelixTheme mode="light">
    <HelixTextarea {...props} />
  </HelixTheme>
)

describe('the generated Textarea', () => {
  test('is a multiline field named by its label, three lines tall by default', async () => {
    await render(<Textarea label="Notes" />)
    const style = styleOf(field())
    expect(field().props.multiline).toBe(true)
    expect(field().props.accessibilityLabel).toBe('Notes')
    expect(typeof style.lineHeight).toBe('number')
    expect(style.height).toBe(3 * (style.lineHeight as number))
    expect(style.textAlignVertical).toBe('top')
  })

  test('stands `rows` lines tall', async () => {
    await render(<Textarea label="Notes" rows={5} />)
    const style = styleOf(field())
    expect(style.height).toBe(5 * (style.lineHeight as number))
  })

  test('grows with its text from `rows` lines to `max-rows`, and scrolls past them', async () => {
    await render(<Textarea autoGrow label="Notes" maxRows={6} rows={2} />)
    const style = styleOf(field())
    const line = style.lineHeight as number
    expect(style.height).toBeUndefined()
    expect(style.minHeight).toBe(2 * line)
    expect(style.maxHeight).toBe(6 * line)
    expect(field().props.scrollEnabled).toBe(true)
  })

  test('asks before each edit, sends input, and sends change once the reader leaves', async () => {
    const events: string[] = []
    await render(
      <Textarea
        label="Notes"
        onBeforeChange={(event) => events.push(`before ${event.detail.value}`)}
        onChange={() => events.push('change')}
        onInput={() => events.push('input')}
      />,
    )
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'Line one\nLine two')
    await fireEvent(field(), 'blur')
    expect(events).toEqual(['before Line one\nLine two', 'input', 'change'])
    expect(field().props.value).toBe('Line one\nLine two')
  })

  test('clears its text and says what is wrong once a required field is empty', async () => {
    await render(<Textarea clearable defaultValue="Draft" label="Notes" required />)
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }))
    expect(field().props.value).toBe('')
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Fill in the field.')).toBeTruthy()
  })
})
