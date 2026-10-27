/*
 * A set that mixes commands and choices, as a menu and its rows: a row with
 * `checkable` turns over, an `exclusive` row turns on and its run off, a
 * command never turns, and the arrows move focus among the rows. The forms
 * are written here in the shape the compiler writes, since no neutral
 * family mixes yet.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text, View } from 'react-native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { behaviorFor } from './compose'

const menuForm: Family = {
  api: {
    collection: { keys: { chooses: false, keeps: [], wrap: true }, mixes: true },
    events: [{ cancelable: true, detail: ['value'], name: 'before-select' }],
    props: [],
    states: [],
  },
  machines: [
    { bind: {}, machine: 'mixed-set' },
    { bind: {}, machine: 'roving-focus' },
    { bind: {}, machine: 'typeahead' },
  ],
  name: 'menu',
  rules: [],
  tag: 'helix-menu',
  tree: [
    {
      attributes: { role: 'menu' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'items',
    },
  ],
  version: '2.0',
}

const switchProp = (name: string) =>
  ({ attribute: true, default: false, name, tier: 'headless', type: 'boolean' }) as const

const itemForm: Family = {
  api: {
    events: [
      { cancelable: true, detail: ['checked'], name: 'before-check' },
      { cancelable: true, detail: ['value'], name: 'before-select' },
    ],
    item: {
      before: 'before-check',
      checkable: 'checkable',
      checked: 'checked',
      chooses: true,
      exclusive: 'exclusive',
      of: 'menu',
    },
    props: [
      switchProp('checkable'),
      switchProp('checked'),
      switchProp('exclusive'),
      { attribute: true, default: '', name: 'value', tier: 'headless', type: 'string' },
    ],
    states: ['checked'],
  },
  machines: [
    { bind: { part: { part: 'item' }, sends: { event: 'before-select' } }, machine: 'press' },
    {
      bind: {
        before: { event: 'before-check' },
        checkable: { prop: 'checkable' },
        checked: { prop: 'checked' },
        exclusive: { prop: 'exclusive' },
      },
      machine: 'mixed-item',
    },
  ],
  name: 'menu-item',
  rules: [],
  tag: 'helix-menu-item',
  tree: [
    {
      attributes: { chooses: true, role: 'menuitem', sends: 'before-select' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'item',
    },
  ],
  version: '2.0',
}

const Menu = element(menuForm, behaviorFor(menuForm))
const Item = element(itemForm, behaviorFor(itemForm))

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The views the rows hear keys on, in the order they first listened. */
let heard: unknown[] = []

beforeEach(() => {
  const fake = fakeKeys<unknown>()
  heard = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!heard.includes(node)) {
        heard.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
  focus = fakeFocus<unknown>()
  setFocus(focus)
})

/** The press of the row whose words are `words`. */
const rowOf = (words: string) => {
  let at = screen.getByText(words).parent
  while (at !== null && at.props.accessibilityRole !== 'menuitem') {
    at = at.parent
  }
  if (at === null) {
    throw new Error(`no row reads ${words}`)
  }
  return at
}

/** What a screen reader hears of the row's checked state. */
const checkedOf = (words: string): unknown => rowOf(words).props.accessibilityState?.checked

const press = async (words: string) => {
  await fireEvent.press(screen.getByText(words))
  await act(async () => undefined)
}

describe('a set that mixes commands and choices', () => {
  test('a choice turns over, asking first, then sends its select; a command never turns', async () => {
    const told: string[] = []
    await render(
      <ThemeProvider tokens={{}}>
        <Menu>
          <Item
            checkable
            onBeforeCheck={(event: { detail: { checked: boolean } }) =>
              told.push(`before ${event.detail.checked}`)
            }
            onBeforeSelect={() => told.push('select')}
            value="grid"
          >
            <Text>Show grid</Text>
          </Item>
          <Item value="copy">
            <Text>Copy</Text>
          </Item>
        </Menu>
      </ThemeProvider>,
    )
    expect(checkedOf('Show grid')).toBe(false)
    expect(checkedOf('Copy')).toBeUndefined()
    await press('Show grid')
    expect(told).toEqual(['before true', 'select'])
    expect(checkedOf('Show grid')).toBe(true)
    await press('Show grid')
    expect(checkedOf('Show grid')).toBe(false)
    await press('Copy')
    expect(checkedOf('Copy')).toBeUndefined()
  })

  test('a refused turn keeps the choice, and the select still goes out', async () => {
    const told: string[] = []
    await render(
      <ThemeProvider tokens={{}}>
        <Menu>
          <Item
            checkable
            onBeforeCheck={(event: { preventDefault: () => void }) => event.preventDefault()}
            onBeforeSelect={() => told.push('select')}
            value="grid"
          >
            <Text>Show grid</Text>
          </Item>
        </Menu>
      </ThemeProvider>,
    )
    await press('Show grid')
    expect(checkedOf('Show grid')).toBe(false)
    expect(told).toEqual(['select'])
  })

  test('an item of a run turns on and its run off, and a divider parts two runs', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Menu>
          <Item checked exclusive value="name">
            <Text>By name</Text>
          </Item>
          <Item exclusive value="date">
            <Text>By date</Text>
          </Item>
          <View />
          <Item checked exclusive value="up">
            <Text>Ascending</Text>
          </Item>
          <Item exclusive value="down">
            <Text>Descending</Text>
          </Item>
        </Menu>
      </ThemeProvider>,
    )
    await press('By date')
    expect([checkedOf('By name'), checkedOf('By date')]).toEqual([false, true])
    expect([checkedOf('Ascending'), checkedOf('Descending')]).toEqual([true, false])
    await press('By date')
    expect(checkedOf('By date')).toBe(true)
  })

  test('the arrows move focus among the items, coming round, and choose nothing', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Menu>
          <Item value="cut">
            <Text>Cut</Text>
          </Item>
          <Item checkable value="wrap">
            <Text>Wrap lines</Text>
          </Item>
        </Menu>
      </ThemeProvider>,
    )
    const [first, second] = heard
    await act(() => {
      expect(keys.press(first, 'ArrowDown')).toBe(true)
    })
    expect(focus.focused()).toBe(second)
    expect(checkedOf('Wrap lines')).toBe(false)
    await act(() => {
      keys.press(second, 'ArrowDown')
    })
    expect(focus.focused()).toBe(first)
  })
})
