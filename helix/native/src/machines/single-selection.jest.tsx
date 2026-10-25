import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { type ReactNode, useContext, useLayoutEffect, useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { collection, type Offer, useMembers } from './collection'
import { useSingleSelection } from './single-selection'

/** A tab set's form, as far as single selection reads it. */
const TABS = {
  api: {
    events: [{ name: 'activate' }, { name: 'before-activate' }],
    props: [{ name: 'active' }, { default: '', name: 'default-active' }],
    states: [],
  },
  name: 'tabs',
  rules: [],
  tag: 'helix-tabs',
  version: '1.0',
} as unknown as Family

const USE: MachineUse = {
  bind: {
    after: { event: 'activate' },
    before: { event: 'before-activate' },
    chosen: { prop: 'active' },
    seed: { prop: 'default-active' },
  },
  machine: 'single-selection',
}

const Joined = collection('tabs')

interface TabsProps {
  readonly active?: string
  readonly children?: ReactNode
  readonly defaultActive?: string
  readonly onActivate?: (event: { detail: { previous: string; value: string } }) => void
  readonly onBeforeActivate?: (event: { detail: { value: string }; preventDefault(): void }) => void
}

/** A set that runs single selection over the tabs that join it. */
const Tabs = (props: TabsProps) => {
  const { join, leave, members } = useMembers(props.children)
  const { active, choose } = useSingleSelection(TABS, props as Props, USE, members)
  const offer = useMemo<Offer>(
    () => ({
      choose,
      chosen: (value) => value === active,
      follows: false,
      hear: () => true,
      join,
      key: () => false,
      leave,
    }),
    [active, choose, join, leave],
  )
  return (
    <Joined.Provider value={offer}>
      <View>{props.children}</View>
      <Text testID="active">{active === '' ? 'none' : active}</Text>
    </Joined.Provider>
  )
}

/** A tab that joins the set around it, and asks it to choose it when pressed. */
const Tab = ({
  disabled = false,
  value,
}: {
  readonly disabled?: boolean
  readonly value: string
}) => {
  const offer = useContext(Joined)
  const key = useRef({}).current
  const join = offer?.join
  const leave = offer?.leave
  useLayoutEffect(() => {
    join?.(key, { chooses: true, disabled, value, words: value })
    return () => leave?.(key)
  }, [disabled, join, key, leave, value])
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: offer?.chosen(value) ?? false }}
      onPress={() => offer?.choose(value)}
    >
      <Text>{value}</Text>
    </Pressable>
  )
}

const current = () => screen.getByTestId('active').props.children

describe('useSingleSelection', () => {
  test('opens on the first enabled tab where nothing names one, and says nothing', async () => {
    const onActivate = jest.fn()
    await render(
      <Tabs onActivate={onActivate}>
        <Tab disabled value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    expect(current()).toBe('b')
    expect(onActivate).not.toHaveBeenCalled()
  })

  test('opens on the tab its seed names', async () => {
    await render(
      <Tabs defaultActive="b">
        <Tab value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    expect(current()).toBe('b')
  })

  test('asks before a press chooses a tab, and then says which it replaced', async () => {
    const heard: string[] = []
    await render(
      <Tabs
        onActivate={(event) =>
          heard.push(`activate ${event.detail.previous} to ${event.detail.value}`)
        }
        onBeforeActivate={(event) => heard.push(`before ${event.detail.value}`)}
      >
        <Tab value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    await fireEvent.press(screen.getByText('b'))
    expect(current()).toBe('b')
    expect(heard).toEqual(['before b', 'activate a to b'])
  })

  test('keeps the current tab and says nothing where a handler refuses the choice', async () => {
    const onActivate = jest.fn()
    await render(
      <Tabs onActivate={onActivate} onBeforeActivate={(event) => event.preventDefault()}>
        <Tab value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    await fireEvent.press(screen.getByText('b'))
    expect(current()).toBe('a')
    expect(onActivate).not.toHaveBeenCalled()
  })

  test('takes a written value with nothing sent, and keeps the choices after it', async () => {
    const onActivate = jest.fn()
    const view = await render(
      <Tabs active="a" onActivate={onActivate}>
        <Tab value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    await view.rerender(
      <Tabs active="b" onActivate={onActivate}>
        <Tab value="a" />
        <Tab value="b" />
      </Tabs>,
    )
    expect(current()).toBe('b')
    expect(onActivate).not.toHaveBeenCalled()
  })

  test('hands the choice to the tab beside one that is removed, and says so', async () => {
    const heard: string[] = []
    const view = await render(
      <Tabs onActivate={(event) => heard.push(event.detail.value)}>
        <Tab value="a" />
        <Tab value="b" />
        <Tab value="c" />
      </Tabs>,
    )
    await fireEvent.press(screen.getByText('b'))
    await view.rerender(
      <Tabs onActivate={(event) => heard.push(event.detail.value)}>
        <Tab value="a" />
        <Tab value="c" />
      </Tabs>,
    )
    expect(current()).toBe('c')
    expect(heard).toEqual(['b', 'c'])
  })
})
