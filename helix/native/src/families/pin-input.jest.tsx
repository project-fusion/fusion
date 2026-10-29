/*
 * The generated Pin Input, drawn from its real intermediate form: one field
 * out of sight over a box a character, typed text cleaned to the characters
 * its type accepts, the caret's box ringed while the field has focus, the
 * mask and the separators, `complete` and `change` as the last box fills,
 * and the message for a short code. `test:native` writes the component
 * beside this file.
 */
import { beforeEach, describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { HelixPinInput, type HelixPinInputProps } from './pin-input/index.native'

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
})

/** The one field a reader types into, which every spec here names. */
const field = () => {
  const found = screen.getAllByLabelText(/./).find((node) => node.type === 'TextInput')
  if (found === undefined) {
    throw new Error('no field is drawn')
  }
  return found
}

/** How many times words are drawn, hidden from screen readers or not, as the boxes are. */
const drawn = (words: string): number =>
  screen.queryAllByText(words, { includeHiddenElements: true }).length

const PinInput = (props: HelixPinInputProps) => (
  <HelixTheme mode="light">
    <HelixPinInput {...props} />
  </HelixTheme>
)

describe('the generated Pin Input', () => {
  test('is one field named by its label, with the keyboard its type asks for and one-time codes', async () => {
    await render(<PinInput label="Code" length={4} />)
    expect(field().props.accessibilityLabel).toBe('Code')
    expect(field().props.inputMode).toBe('numeric')
    expect(field().props.autoComplete).toBe('one-time-code')
    expect(field().props.maxLength).toBe(4)
  })

  test('keeps the characters its type accepts, cased as case asks', async () => {
    await render(<PinInput case="upper" label="Code" length={4} type="alphanumeric" />)
    await fireEvent.changeText(field(), 'a-b')
    expect(field().props.value).toBe('AB')
  })

  test('sends complete with the code and then change as the last box fills', async () => {
    const events: string[] = []
    await render(
      <PinInput
        label="Code"
        length={4}
        onChange={() => events.push('change')}
        onComplete={(event) => events.push(`complete ${event.detail.value}`)}
        onInput={() => events.push('input')}
      />,
    )
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), '12')
    await fireEvent.changeText(field(), '1234')
    expect(events).toEqual(['input', 'input', 'complete 1234', 'change'])
  })

  test('draws each character in its box, the mask in its place, and the separators', async () => {
    await render(<PinInput defaultValue="1234" format="##-##" label="Code" length={4} />)
    expect(['1', '2', '3', '4', '-'].map(drawn)).toEqual([1, 1, 1, 1, 1])
    await render(<PinInput defaultValue="12" label="Code" length={4} mask />)
    expect([drawn('•'), drawn('1')]).toEqual([2, 0])
  })

  test('says a short code is wrong in its own words once the reader leaves it', async () => {
    await render(<PinInput label="Code" length={4} />)
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), '12')
    await fireEvent(field(), 'blur')
    expect(screen.getByText('Please enter all 4 characters.')).toBeTruthy()
  })
})
