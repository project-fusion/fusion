import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { HelixRoot } from '../index'
import { HelixListbox } from './listbox/index.native'
import { HelixOption, HelixOptionGroup, HelixOptionSeparator } from './option/index.native'

/** The row that says these words. */
const row = (words: string) => {
  for (
    let at = screen.getByText(words, { includeHiddenElements: true }).parent;
    at;
    at = at.parent
  ) {
    if (typeof at.props.onPress === 'function' || typeof at.props.onClick === 'function') {
      return at
    }
  }
  throw new Error(`no row says "${words}"`)
}

const settled = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

const draw = async (props: Record<string, unknown> = {}) => {
  await render(
    <HelixRoot>
      <HelixListbox label="Fruit" {...props}>
        <HelixOption value="apple">Apple</HelixOption>
        <HelixOption value="banana">Banana</HelixOption>
        <HelixOption disabled value="cherry">
          Cherry
        </HelixOption>
        <HelixOption value="date">Date</HelixOption>
      </HelixListbox>
    </HelixRoot>,
  )
  await settled()
}

describe('a list of options on a phone', () => {
  test('a press chooses one, asks first, and says it stood', async () => {
    const before = jest.fn()
    const change = jest.fn()
    await draw({ onBeforeChange: before, onChange: change })
    await fireEvent.press(row('Banana'))
    await settled()
    expect(before).toHaveBeenCalledTimes(1)
    expect(change).toHaveBeenCalledTimes(1)
    expect(row('Banana').props.accessibilityState.selected).toBe(true)
    expect(row('Apple').props.accessibilityState.selected).toBe(false)
  })

  test('a refused choice leaves the value', async () => {
    await draw({
      onBeforeChange: (event: { preventDefault: () => void }) => event.preventDefault(),
    })
    await fireEvent.press(row('Banana'))
    await settled()
    expect(row('Banana').props.accessibilityState.selected).toBe(false)
  })

  test('under multiple, a press toggles', async () => {
    await draw({ multiple: true })
    await fireEvent.press(row('Apple'))
    await settled()
    await fireEvent.press(row('Banana'))
    await settled()
    await fireEvent.press(row('Apple'))
    await settled()
    expect(row('Apple').props.accessibilityState.selected).toBe(false)
    expect(row('Banana').props.accessibilityState.selected).toBe(true)
  })

  test('a disabled option is not chosen', async () => {
    await draw()
    await fireEvent.press(row('Cherry'))
    await settled()
    expect(row('Cherry').props.accessibilityState.selected).toBe(false)
  })

  test('the value written selects its option', async () => {
    await draw({ value: 'date' })
    expect(row('Date').props.accessibilityState.selected).toBe(true)
  })

  test('an option written selected seeds the value', async () => {
    await render(
      <HelixRoot>
        <HelixListbox label="Fruit">
          <HelixOption value="apple">Apple</HelixOption>
          <HelixOption selected value="banana">
            Banana
          </HelixOption>
        </HelixListbox>
      </HelixRoot>,
    )
    await settled()
    await settled()
    expect(row('Banana').props.accessibilityState.selected).toBe(true)
  })

  test('a filter hides what it leaves out, and a group it emptied', async () => {
    await render(
      <HelixRoot>
        <HelixListbox defaultFilter="app" filterable label="Fruit">
          <HelixOptionGroup label="Soft">
            <HelixOption value="banana">Banana</HelixOption>
          </HelixOptionGroup>
          <HelixOptionSeparator />
          <HelixOptionGroup label="Crisp">
            <HelixOption value="apple">Apple</HelixOption>
          </HelixOptionGroup>
        </HelixListbox>
      </HelixRoot>,
    )
    await settled()
    await settled()
    expect(screen.queryByText('Banana')).toBeNull()
    expect(screen.queryByText('Soft')).toBeNull()
    expect(screen.getByText('Apple')).toBeTruthy()
  })

  test('a filter that leaves nothing says so', async () => {
    await draw({ defaultFilter: 'zzz', filterable: true, noResultsText: 'Nothing here' })
    await settled()
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })

  test('items draws its options from data', async () => {
    await render(
      <HelixRoot>
        <HelixListbox items={['One', { label: 'Two words', value: 'two' }]} label="Numbers" />
      </HelixRoot>,
    )
    await settled()
    expect(screen.getByText('Two words')).toBeTruthy()
    await fireEvent.press(row('Two words'))
    await settled()
    expect(row('Two words').props.accessibilityState.selected).toBe(true)
  })
})
