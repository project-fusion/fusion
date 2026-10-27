import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { type ReactNode, useContext, useLayoutEffect, useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { collection, type Offer, useMembers } from './collection'
import { useMultipleSelection } from './multiple-selection'

/** A list's form, as far as multiple selection reads it. */
const LIST = {
  api: {
    events: [{ name: 'action' }, { name: 'before-change' }, { name: 'change' }],
    props: [
      { default: 'all', name: 'disabled-behavior' },
      { default: 'toggle', name: 'selection-behavior' },
      { name: 'selection-mode' },
      { name: 'value' },
    ],
    states: [],
  },
  name: 'list',
  rules: [],
  tag: 'helix-list',
  version: '2.0',
} as unknown as Family

const USE: MachineUse = {
  bind: {
    after: { event: 'change' },
    before: { event: 'before-change' },
    behavior: { prop: 'selection-behavior' },
    chosen: { prop: 'value' },
    mode: { prop: 'selection-mode' },
  },
  machine: 'multiple-selection',
}

const Joined = collection('list')

/** A list that runs multiple selection over the rows that join it, and shows its value. */
const List = (props: Readonly<Record<string, unknown>> & { readonly children?: ReactNode }) => {
  const { join, leave, members } = useMembers(props.children)
  const { choose, chosen } = useMultipleSelection(LIST, props as Props, USE, members)
  const offer = useMemo<Offer>(
    () => ({ choose, chosen, follows: true, hear: () => true, join, key: () => false, leave }),
    [choose, chosen, join, leave],
  )
  const value = members.filter((member) => chosen(member.value)).map((member) => member.value)
  return (
    <Joined.Provider value={offer}>
      <View>{props.children}</View>
      <Text testID="value">{value.length === 0 ? 'nothing' : value.join(',')}</Text>
    </Joined.Provider>
  )
}

interface RowProps {
  readonly href?: string
  readonly onAction?: (event: { value: string }) => void
  readonly value: string
}

/** A row that joins the list around it, and presses it when tapped. */
const Row = ({ href, onAction, value }: RowProps) => {
  const offer = useContext(Joined)
  const key = useRef({}).current
  const join = offer?.join
  const leave = offer?.leave
  const act = useRef(onAction)
  act.current = onAction
  useLayoutEffect(() => {
    join?.(key, {
      act: () => act.current?.({ value }),
      chooses: true,
      disabled: false,
      ...(href === undefined ? {} : { link: href }),
      value,
      words: value,
    })
    return () => leave?.(key)
  }, [href, join, key, leave, value])
  return (
    <Pressable accessibilityRole="button" onPress={() => offer?.choose(value)}>
      <Text>{value}</Text>
    </Pressable>
  )
}

const shown = () => screen.getByTestId('value').props.children

describe('useMultipleSelection', () => {
  test('adds and takes out each row pressed in a list that chooses many', async () => {
    const heard: string[] = []
    await render(
      <List
        onBeforeChange={(event: { detail: { value: string } }) =>
          heard.push(`before ${event.detail.value}`)
        }
        onChange={(event: { target: { value: string } }) =>
          heard.push(`change ${event.target.value}`)
        }
        selectionMode="multiple"
      >
        <Row value="a" />
        <Row value="b" />
      </List>,
    )
    await fireEvent.press(screen.getByText('b'))
    await fireEvent.press(screen.getByText('a'))
    await fireEvent.press(screen.getByText('b'))
    expect(shown()).toBe('a')
    expect(heard).toEqual([
      'before b',
      'change b',
      'before a,b',
      'change a,b',
      'before a',
      'change a',
    ])
  })

  test('chooses one row at a time in a list that chooses one', async () => {
    await render(
      <List selectionMode="single">
        <Row value="a" />
        <Row value="b" />
      </List>,
    )
    await fireEvent.press(screen.getByText('a'))
    await fireEvent.press(screen.getByText('b'))
    expect(shown()).toBe('b')
  })

  test('keeps its value and says nothing where a handler refuses the change', async () => {
    const onChange = jest.fn()
    await render(
      <List
        onBeforeChange={(event: { preventDefault(): void }) => event.preventDefault()}
        onChange={onChange}
        selectionMode="multiple"
      >
        <Row value="a" />
      </List>,
    )
    await fireEvent.press(screen.getByText('a'))
    expect(shown()).toBe('nothing')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('acts on a row in a list that chooses nothing: the row hears it, then the list', async () => {
    const heard: string[] = []
    await render(
      <List
        onAction={(event: { target: { value: string } }) =>
          heard.push(`list ${event.target.value}`)
        }
        selectionMode="none"
      >
        <Row onAction={(event) => heard.push(`row ${event.value}`)} value="a" />
      </List>,
    )
    await fireEvent.press(screen.getByText('a'))
    expect(heard).toEqual(['row a', 'list a'])
    expect(shown()).toBe('nothing')
  })

  test('follows the link of a row it acts on, through the open-link capability', async () => {
    const opened = fakeOpenLink()
    setOpenLink(opened)
    await render(
      <List selectionMode="none">
        <Row href="https://fusion.dev" value="a" />
      </List>,
    )
    await fireEvent.press(screen.getByText('a'))
    expect(opened.opened).toEqual(['https://fusion.dev'])
  })

  test('sends nothing from a list with no selection mode, which a reader only reads', async () => {
    const onChange = jest.fn()
    const onAction = jest.fn()
    await render(
      <List onAction={onAction} onChange={onChange}>
        <Row value="a" />
      </List>,
    )
    await fireEvent.press(screen.getByText('a'))
    expect(onChange).not.toHaveBeenCalled()
    expect(onAction).not.toHaveBeenCalled()
  })

  test('takes a written value with nothing sent', async () => {
    const onChange = jest.fn()
    const view = await render(
      <List onChange={onChange} selectionMode="multiple" value="a">
        <Row value="a" />
        <Row value="b" />
      </List>,
    )
    await view.rerender(
      <List onChange={onChange} selectionMode="multiple" value="a,b">
        <Row value="a" />
        <Row value="b" />
      </List>,
    )
    expect(shown()).toBe('a,b')
    expect(onChange).not.toHaveBeenCalled()
  })
})
