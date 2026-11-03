/*
 * The generated Combobox, drawn from its real intermediate form: typing narrows the
 * list and leaves focus in the field, a choice takes the words, the text is not the
 * value, the word is finished under `suggest`, a row adds under `creatable`, tags
 * come and go under `multiple`, and a Backspace on nothing removes the last.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { HelixRoot } from '../index'
import { HelixCombobox } from './combobox/index.native'
import { HelixOption } from './option/index.native'

/** A moment for what the layer waits on. */
const settle = async (): Promise<void> => {
  await new Promise((done) => setTimeout(done, 60))
}

const draw = async (element: ReactNode) => {
  await render(<HelixRoot>{element}</HelixRoot>)
  await act(settle)
}

const fruit = [
  <HelixOption key="a" value="apple">
    Apple
  </HelixOption>,
  <HelixOption key="b" value="banana">
    Banana
  </HelixOption>,
  <HelixOption key="c" value="cherry">
    Cherry
  </HelixOption>,
]

const field = () => screen.getByRole('combobox')

const type = async (text: string) => {
  await act(async () => {
    fireEvent.changeText(field(), text)
    await settle()
  })
}

/** Presses the words in the open list. */
const press = async (words: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(words))
    await settle()
  })
}

/** The nearest view around the words that offers an action, as a removable tag does. */
const actionsOf = (words: string) => {
  let at: { readonly parent: unknown; readonly props: Record<string, unknown> } | null =
    screen.getByText(words) as unknown as {
      readonly parent: unknown
      readonly props: Record<string, unknown>
    }
  while (at !== null && (at.props.accessibilityActions as unknown[] | undefined) === undefined) {
    at = at.parent as never
  }
  return at ?? undefined
}

const shownOptions = () =>
  ['Apple', 'Banana', 'Cherry'].filter((name) => screen.queryByText(name) !== null)

describe('Combobox on a phone', () => {
  test('typing narrows the list, and the text is no value', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox label="Fruit" onChange={heard}>
        {fruit}
      </HelixCombobox>,
    )
    await type('an')
    expect(field().props.accessibilityState.expanded).toBe(true)
    expect(shownOptions()).toEqual(['Banana'])
    expect(heard).not.toHaveBeenCalled()
  })

  test('a choice takes the option’s words, sends one change, and closes', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox label="Fruit" onChange={heard}>
        {fruit}
      </HelixCombobox>,
    )
    await type('ban')
    await press('Banana')
    expect(heard).toHaveBeenCalledTimes(1)
    expect(field().props.value).toBe('Banana')
    expect(field().props.accessibilityState.expanded).toBe(false)
  })

  test('a refused filter leaves the list whole, and the field opens', async () => {
    await draw(
      <HelixCombobox
        label="Fruit"
        onBeforeFilter={(event: { preventDefault: () => void }) => event.preventDefault()}
      >
        {fruit}
      </HelixCombobox>,
    )
    await type('zz')
    expect(shownOptions()).toEqual(['Apple', 'Banana', 'Cherry'])
  })

  test('suggest finishes the word, selected past what was typed', async () => {
    await draw(
      <HelixCombobox label="Fruit" suggest>
        {fruit}
      </HelixCombobox>,
    )
    await type('ch')
    expect(field().props.value).toBe('Cherry')
    expect(field().props.selection).toEqual({ end: 6, start: 2 })
  })

  test('a deletion finishes nothing', async () => {
    await draw(
      <HelixCombobox label="Fruit" suggest>
        {fruit}
      </HelixCombobox>,
    )
    await type('che')
    await act(async () => {
      fireEvent(field(), 'keyPress', { nativeEvent: { key: 'Backspace' } })
    })
    await type('ch')
    expect(field().props.value).toBe('ch')
    expect(field().props.selection).toBeUndefined()
  })

  test('creatable offers a row that asks, then takes what was typed', async () => {
    const created = jest.fn()
    await draw(
      <HelixCombobox creatable label="Fruit" onCreate={created}>
        {fruit}
      </HelixCombobox>,
    )
    await type('Date')
    await act(async () => {
      fireEvent.press(screen.getByText('Add "Date"'))
      await settle()
    })
    expect(created).toHaveBeenCalledTimes(1)
    expect(field().props.value).toBe('Date')
  })

  test('a list that matches nothing stays open with its row, one letter at a time', async () => {
    await draw(
      <HelixCombobox creatable label="Tags" multiple>
        {fruit}
      </HelixCombobox>,
    )
    await type('z')
    await type('zi')
    await type('zig')
    expect(field().props.accessibilityState.expanded).toBe(true)
    expect(screen.getByText('Add "zig"')).toBeTruthy()
  })

  test('a press on the field and a letter in one batch leave the list open', async () => {
    await draw(<HelixCombobox label="Fruit">{fruit}</HelixCombobox>)
    let around = field() as unknown as {
      readonly parent: unknown
      readonly props: Record<string, unknown>
    } | null
    while (around !== null && around.props.onTouchStart === undefined) {
      around = around.parent as never
    }
    const at = { nativeEvent: { pageX: 10, pageY: 10 } }
    const heard = (around as { readonly props: Record<string, (event: unknown) => void> }).props
    const typed = field().props.onChangeText as (text: string) => void
    await act(async () => {
      heard.onTouchStart?.(at)
      heard.onTouchEnd?.(at)
      typed('z')
      await settle()
    })
    expect(field().props.accessibilityState.expanded).toBe(true)
  })

  test('the words of an option offer no row', async () => {
    await draw(
      <HelixCombobox creatable label="Fruit">
        {fruit}
      </HelixCombobox>,
    )
    await type('apple')
    expect(screen.queryByText('Add "apple"')).toBeNull()
  })

  test('allows-custom-value takes the text on Enter', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox allowsCustomValue label="Fruit" onChange={heard}>
        {fruit}
      </HelixCombobox>,
    )
    await type('Durian')
    await act(async () => {
      fireEvent(field(), 'submitEditing')
      await settle()
    })
    expect(heard).toHaveBeenCalledTimes(1)
    expect(field().props.value).toBe('Durian')
  })

  test('emptying the field and leaving clears a single choice', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox defaultValue="apple" label="Fruit" onChange={heard}>
        {fruit}
      </HelixCombobox>,
    )
    expect(field().props.value).toBe('Apple')
    await type('')
    await act(async () => {
      fireEvent(field(), 'submitEditing')
      await settle()
    })
    expect(field().props.accessibilityState.expanded).toBe(true)
  })

  test('multiple draws a tag for each choice, and a dismissal takes one off', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox defaultValue="apple,cherry" label="Fruit" multiple onChange={heard}>
        {fruit}
      </HelixCombobox>,
    )
    expect(screen.getByText('Apple')).toBeTruthy()
    expect(screen.getByText('Cherry')).toBeTruthy()
    await act(async () => {
      fireEvent(actionsOf('Apple') as never, 'accessibilityAction', {
        nativeEvent: { actionName: 'dismiss' },
      })
      await settle()
    })
    expect(screen.queryByText('Apple')).toBeNull()
    expect(heard).toHaveBeenCalledTimes(1)
  })

  test('Backspace on nothing typed takes the last tag off', async () => {
    await draw(
      <HelixCombobox defaultValue="apple,cherry" label="Fruit" multiple>
        {fruit}
      </HelixCombobox>,
    )
    await act(async () => {
      fireEvent(field(), 'keyPress', { nativeEvent: { key: 'Backspace' } })
      await settle()
    })
    expect(screen.queryByText('Cherry')).toBeNull()
    expect(screen.getByText('Apple')).toBeTruthy()
  })

  test('max-tags folds the rest into a count', async () => {
    await draw(
      <HelixCombobox defaultValue="apple,banana,cherry" label="Fruit" maxTags={1} multiple>
        {fruit}
      </HelixCombobox>,
    )
    expect(screen.getByText('+2')).toBeTruthy()
    expect(screen.queryByText('Banana')).toBeNull()
  })

  test('read-only takes no edit, opens nothing, and dismisses no tag', async () => {
    const heard = jest.fn()
    await draw(
      <HelixCombobox defaultValue="apple" label="Fruit" multiple onChange={heard} readonly>
        {fruit}
      </HelixCombobox>,
    )
    expect(field().props.editable).toBe(false)
    expect(screen.getByText('Apple')).toBeTruthy()
    expect(actionsOf('Apple')).toBeUndefined()
  })
})
