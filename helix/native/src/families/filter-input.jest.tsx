/*
 * The generated Filter Input, drawn from its real intermediate form: a token's remove
 * press reaches the field with the token as its target, Backspace in an empty field
 * asks the last token to go, `max-tags` counts the rest, Return reads a typed filter
 * into a facet and `chips` draws it, suggestions open with focus and a press says
 * `before-select`, and a menu's tick is a facet the field hears.
 */
import { describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixRoot } from '../index'
import type { FilterInputHandle } from '../machines/filter-input-handle'
import { HelixButton } from './button/index.native'
import {
  HelixFilterChip,
  HelixFilterField,
  HelixFilterInput,
  HelixFilterMenu,
} from './filter-input/index.native'
import { HelixOption } from './option/index.native'

/** A moment for what the layer waits on. */
const settle = async (): Promise<void> => {
  await new Promise((done) => setTimeout(done, 60))
}

const draw = async (element: ReactNode) => {
  await render(<HelixRoot>{element}</HelixRoot>)
  await act(settle)
}

const field = () => screen.getByPlaceholderText('Add a filter')

const on = async (run: () => void) => {
  await act(async () => {
    run()
    await settle()
  })
}

/** A chip for each name, its values the name and a word, as a page draws them. */
const chips = (names: readonly string[]) =>
  names.map((name) => (
    <HelixFilterChip dismissible key={name} label={name} name={name.toLowerCase()}>
      <Text>{`${name} value`}</Text>
    </HelixFilterChip>
  ))

const DISPOSITION = (
  <HelixFilterField label="Disposition" name="disposition">
    <HelixOption value="refunded">Refunded</HelixOption>
    <HelixOption value="settled">Settled</HelixOption>
  </HelixFilterField>
)

describe('Filter Input on a phone', () => {
  test("a token's remove press reaches the field, with the token as its target", async () => {
    const heard = jest.fn((event: { target: { getAttribute: (name: string) => string | null } }) =>
      event.target.getAttribute('name'),
    )
    await draw(
      <HelixFilterInput
        label="Filter rows"
        onDismiss={heard as never}
        placeholder="Add a filter"
        tags={chips(['Owner', 'Env'])}
      />,
    )
    await on(() => fireEvent.press(screen.getByLabelText('Remove filter Env Env value')))
    expect(heard).toHaveBeenCalledTimes(1)
    expect(heard.mock.results[0]?.value).toBe('env')
  })

  test('Backspace in an empty field asks the last token to go', async () => {
    const heard = jest.fn((event: { target: { getAttribute: (name: string) => string | null } }) =>
      event.target.getAttribute('name'),
    )
    await draw(
      <HelixFilterInput
        label="Filter rows"
        onDismiss={heard as never}
        placeholder="Add a filter"
        tags={chips(['Owner', 'Env'])}
      />,
    )
    await on(() => fireEvent(field(), 'keyPress', { nativeEvent: { key: 'Backspace' } }))
    expect(heard.mock.results.map((one) => one.value)).toEqual(['env'])
  })

  test('max-tags draws the first tokens and counts the rest', async () => {
    await draw(
      <HelixFilterInput
        label="Filter rows"
        maxTags={2}
        placeholder="Add a filter"
        tags={chips(['Owner', 'Env', 'Status', 'Area'])}
      />,
    )
    expect(screen.queryByText('Status value')).toBeNull()
    expect(screen.getByText('Env value')).toBeTruthy()
    expect(screen.getByText('+2')).toBeTruthy()
  })

  test('Return reads a typed filter into a facet, and chips draws it', async () => {
    const facets: unknown[] = []
    await draw(
      <HelixFilterInput
        chips
        label="Filter rows"
        onFacet={(event) => facets.push(event.detail)}
        placeholder="Add a filter"
      >
        {DISPOSITION}
      </HelixFilterInput>,
    )
    await on(() => fireEvent.changeText(field(), 'refund disposition:settled'))
    await on(() => fireEvent(field(), 'submitEditing'))
    expect(facets).toEqual([
      {
        arity: 'many',
        field: 'disposition',
        label: 'Disposition',
        operator: 'any',
        operatorLabel: '',
        values: ['settled'],
      },
    ])
    expect(field().props.value).toBe('refund')
    /* The chip shows the values as the page's model names them, as the web's does. */
    expect(screen.getByText('settled')).toBeTruthy()
  })

  test('suggestions open with focus, narrow by the term, and a press says before-select', async () => {
    const chosen: string[] = []
    await draw(
      <HelixFilterInput
        filterSuggestions
        label="Filter rows"
        onBeforeSelect={(event) => {
          chosen.push(event.detail.value)
        }}
        placeholder="Add a filter"
        suggestions={['owner', 'status'].map((one) => (
          <HelixOption key={one} value={one}>
            {one}
          </HelixOption>
        ))}
      />,
    )
    await on(() => fireEvent(field(), 'focus'))
    expect(screen.getByText('status')).toBeTruthy()
    await on(() => fireEvent.changeText(field(), 'ow'))
    await on(() =>
      fireEvent(field(), 'selectionChange', { nativeEvent: { selection: { end: 2, start: 2 } } }),
    )
    expect(screen.queryByText('status')).toBeNull()
    await on(() => fireEvent.press(screen.getByText('owner')))
    expect(chosen).toEqual(['owner'])
  })

  test("a menu's tick is a facet the field hears", async () => {
    const facets: { readonly values: readonly string[] }[] = []
    await draw(
      <HelixFilterInput
        label="Filter rows"
        onFacet={(event) => facets.push(event.detail as never)}
        placeholder="Add a filter"
        start={
          <HelixFilterMenu label="Filter" trigger={<HelixButton>Open the menu</HelixButton>}>
            {DISPOSITION}
          </HelixFilterMenu>
        }
      />,
    )
    /* A field's row opens its page, and a value's row ticks it. */
    await on(() => fireEvent.press(screen.getByText('Open the menu')))
    await on(() => fireEvent.press(screen.getByText('Disposition')))
    await on(() => fireEvent.press(screen.getByText('Settled')))
    expect(facets.map((one) => one.values)).toEqual([['settled']])
    /* A typed filter on a field the menu holds goes through the menu, which adds it. */
    await on(() => fireEvent.changeText(field(), 'disposition:refunded'))
    await on(() => fireEvent(field(), 'submitEditing'))
    expect(facets.map((one) => one.values)).toEqual([['settled'], ['refunded']])
  })

  test('the handle reads and writes the text and puts the caret', async () => {
    const ref = createRef<FilterInputHandle>()
    await draw(
      <HelixFilterInput label="Filter rows" placeholder="Add a filter" ref={ref as never} />,
    )
    await on(() => {
      if (ref.current) {
        ref.current.value = 'owner:'
      }
    })
    expect(field().props.value).toBe('owner:')
    await on(() => ref.current?.setSelectionRange(6, 6))
    expect(field().props.selection).toEqual({ end: 6, start: 6 })
    expect(typeof ref.current?.validate).toBe('function')
  })
})
