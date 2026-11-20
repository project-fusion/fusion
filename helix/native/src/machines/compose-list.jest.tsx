import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys, type Held } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { element } from '../render/element'
import { behaviorFor } from './compose'
import { list, row } from './compose.fixtures'

/*
 * The keys a list hears on its rows, and its disabled rows, as the web list
 * has them. `compose.jest.tsx` holds the rest of the native composer, and
 * the two are one spec split at the 400 lines a file may have.
 */

const List = element(list, behaviorFor(list))
const Row = element(row, behaviorFor(row))

/** The press a row's words are drawn in, which names no role, as a list's row does not. */
const rowOf = (words: string) => {
  let at = screen.getByText(words)
  while (at.props.accessibilityState === undefined && at.parent !== null) {
    at = at.parent
  }
  return at
}

/** The words of each row chosen, as a screen reader hears it, in order. */
const chosen = (): string[] =>
  ['Apples', 'Bread', 'Cheese'].filter(
    (words) => rowOf(words).props.accessibilityState?.selected === true,
  )

let keys: FakeKeys<unknown> = fakeKeys()
let focus = fakeFocus<unknown>()
/* The part each row listens for keys on, in the order they started. */
let heard: unknown[] = []
/* What the list and its rows told, in order. */
let told: string[] = []

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      heard.push(node)
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
  focus = fakeFocus<unknown>()
  setFocus(focus)
  setOpenLink(fakeOpenLink())
  told = []
})

/** Presses `key` on the row listening at `at`, and answers whether the list took it. */
const press = async (at: number, key: string, held: Held = {}): Promise<boolean> => {
  let took = false
  await act(() => {
    took = keys.press(heard[at], key, held)
  })
  return took
}

/** A list of three rows with these props, Bread disabled where `disabled`, telling what it sends. */
const draw = (props: Readonly<Record<string, unknown>>, disabled = false) =>
  render(
    <List
      onAction={(event: { target: { value: string } }) => told.push(`list ${event.target.value}`)}
      onBeforeChange={(event: { detail: { value: string } }) =>
        told.push(`before ${event.detail.value}`)
      }
      {...props}
    >
      <Row value="a">Apples</Row>
      <Row
        disabled={disabled}
        onAction={(event: { target: { value: string } }) => told.push(`row ${event.target.value}`)}
        value="b"
      >
        Bread
      </Row>
      <Row value="c">Cheese</Row>
    </List>,
  )

describe('behaviorFor a list, by the keys pressed on its rows', () => {
  test('Space chooses the row, Enter acts on it, and Escape lets go of the choice', async () => {
    await draw({ selectionMode: 'single' })
    expect(await press(1, ' ')).toBe(true)
    expect(chosen()).toEqual(['Bread'])
    expect(await press(1, 'Enter')).toBe(true)
    expect(told).toEqual(['before b', 'row b', 'list b'])
    expect(chosen()).toEqual(['Bread'])
    expect(await press(1, 'Escape')).toBe(true)
    expect(chosen()).toEqual([])
    expect(await press(1, 'Escape')).toBe(false)
  })

  test('Shift with Space or an arrow takes in the rows from the last one pressed', async () => {
    await draw({ selectionMode: 'multiple' })
    await press(0, ' ')
    expect(await press(0, 'ArrowDown', { shift: true })).toBe(true)
    expect(focus.focused()).toBe(heard[1])
    expect(chosen()).toEqual(['Apples', 'Bread'])
    await press(2, ' ', { shift: true })
    expect(chosen()).toEqual(['Apples', 'Bread', 'Cheese'])
  })

  test('Shift with an arrow back toward the anchor lets go of the rows the range passed', async () => {
    await draw({ selectionMode: 'multiple' })
    await press(0, ' ')
    await press(0, 'ArrowDown', { shift: true })
    await press(1, 'ArrowDown', { shift: true })
    expect(chosen()).toEqual(['Apples', 'Bread', 'Cheese'])
    await press(2, 'ArrowUp', { shift: true })
    expect(chosen()).toEqual(['Apples', 'Bread'])
  })

  test('Control or Command with Space adds or takes out the row under toggle, as the web list does', async () => {
    await draw({ selectionMode: 'multiple' })
    expect(await press(0, ' ', { control: true })).toBe(true)
    await press(2, ' ', { meta: true })
    expect(chosen()).toEqual(['Apples', 'Cheese'])
    await press(0, ' ', { control: true })
    expect(chosen()).toEqual(['Cheese'])
  })

  test('the arrows choose the row they arrive on under replace, and Control or Command moves without choosing', async () => {
    await draw({ selectionBehavior: 'replace', selectionMode: 'multiple' })
    await press(0, 'ArrowDown')
    expect(focus.focused()).toBe(heard[1])
    expect(chosen()).toEqual(['Bread'])
    await press(1, 'ArrowDown', { meta: true })
    expect(focus.focused()).toBe(heard[2])
    expect(chosen()).toEqual(['Bread'])
    await press(2, ' ', { control: true })
    expect(chosen()).toEqual(['Bread', 'Cheese'])
  })

  test('a letter chooses the row it moves to under replace', async () => {
    await draw({ selectionBehavior: 'replace', selectionMode: 'multiple' })
    expect(await press(0, 'c')).toBe(true)
    expect(focus.focused()).toBe(heard[2])
    expect(chosen()).toEqual(['Cheese'])
  })

  test('Control or Command with A chooses every row, in a list that chooses many', async () => {
    await draw({ selectionMode: 'multiple' })
    expect(await press(0, 'a', { control: true })).toBe(true)
    expect(chosen()).toEqual(['Apples', 'Bread', 'Cheese'])
    expect(await press(0, 'A', { meta: true })).toBe(true)
    expect(told).toEqual(['before a,b,c'])
  })

  test('leaves alone a key with Alt held, and A in a list that chooses one', async () => {
    await draw({ selectionMode: 'single' })
    expect(await press(0, ' ', { alt: true })).toBe(false)
    expect(await press(0, 'a', { control: true })).toBe(false)
    expect(told).toEqual([])
  })

  test('leaves alone Space and Enter in a list a reader reads', async () => {
    await draw({})
    expect(await press(0, ' ')).toBe(false)
    expect(await press(0, 'Enter')).toBe(false)
    expect(told).toEqual([])
  })
})

describe('behaviorFor a list, with a disabled row', () => {
  test('passes over the row and takes no press on it, which a screen reader hears as disabled', async () => {
    await draw({ selectionMode: 'single' }, true)
    expect(rowOf('Bread').props.accessibilityState?.disabled).toBe(true)
    await fireEvent.press(rowOf('Bread'))
    await press(0, 'ArrowDown')
    expect(focus.focused()).toBe(heard[2])
    expect(told).toEqual([])
  })

  test('acts on the row pressed under disabled-behavior="selection", and keeps it out of the choice', async () => {
    await draw({ disabledBehavior: 'selection', selectionMode: 'single' }, true)
    expect(rowOf('Bread').props.accessibilityState?.disabled).toBe(false)
    await fireEvent.press(rowOf('Bread'))
    expect(told).toEqual(['row b', 'list b'])
    expect(chosen()).toEqual([])
  })

  test('reaches the row with the keys under disabled-behavior="selection", where Enter acts and Space chooses nothing', async () => {
    await draw({ disabledBehavior: 'selection', selectionMode: 'multiple' }, true)
    await press(0, 'ArrowDown')
    expect(focus.focused()).toBe(heard[1])
    await press(1, 'Enter')
    expect(await press(1, ' ')).toBe(true)
    expect(told).toEqual(['row b', 'list b'])
    await press(1, 'a', { control: true })
    expect(chosen()).toEqual(['Apples', 'Cheese'])
  })
})
