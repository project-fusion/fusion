import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { element } from '../render/element'
import type { Family } from '../style/form'
import { behaviorFor, scrollingOf } from './compose'
import { button, list, row, tab, tabs } from './compose.fixtures'

const Tabs = element(tabs, behaviorFor(tabs))
const Tab = element(tab, behaviorFor(tab))
const List = element(list, behaviorFor(list))
const Row = element(row, behaviorFor(row))
const Button = element(button, behaviorFor(button))

/** Whether the tab named by its words is chosen, as a screen reader hears it. */
const chosen = (name: string): boolean =>
  screen.getByRole('tab', { name }).props.accessibilityState?.selected === true

/** The press a row's words are drawn in, which names no role, as a list's row does not. */
const rowOf = (words: string) => {
  let at = screen.getByText(words)
  while (at.props.accessibilityState === undefined && at.parent !== null) {
    at = at.parent
  }
  return at
}

/** Whether the row drawn with these words is chosen, as a screen reader hears it. */
const rowChosen = (words: string): boolean =>
  rowOf(words).props.accessibilityState?.selected === true

let keys: FakeKeys<unknown> = fakeKeys()
let focus = fakeFocus<unknown>()
let opened = fakeOpenLink()
/* The part each item listens for keys on, in the order they started. */
let heard: unknown[] = []

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
  opened = fakeOpenLink()
  setOpenLink(opened)
})

describe('behaviorFor a set of tabs', () => {
  test('chooses a tab pressed, telling the tab, the set, and then the change', async () => {
    const told: string[] = []
    await render(
      <Tabs
        onActivate={(event: { detail: { previous: string; value: string } }) =>
          told.push(`activate ${event.detail.previous}>${event.detail.value}`)
        }
        onBeforeActivate={(event: { detail: { value: string } }) =>
          told.push(`before ${event.detail.value}`)
        }
        onSelect={(event: { detail: { value: string }; target: { value: string } }) =>
          told.push(`set hears ${event.detail.value} from ${event.target.value}`)
        }
      >
        <Tab
          onSelect={(event: { detail: { value: string } }) =>
            told.push(`tab ${event.detail.value}`)
          }
          value="a"
        >
          Alpha
        </Tab>
        <Tab value="b">Beta</Tab>
      </Tabs>,
    )
    expect(chosen('Alpha')).toBe(true)
    await fireEvent.press(screen.getByRole('tab', { name: 'Beta' }))
    expect(told).toEqual(['set hears b from b', 'before b', 'activate a>b'])
    expect(chosen('Beta')).toBe(true)
    expect(chosen('Alpha')).toBe(false)
  })

  test('keeps its choice where the tab or the set refuses the select', async () => {
    await render(
      <Tabs
        onSelect={(event: { detail: { value: string }; preventDefault(): void }) => {
          if (event.detail.value === 'c') {
            event.preventDefault()
          }
        }}
      >
        <Tab value="a">Alpha</Tab>
        <Tab onSelect={(event: { preventDefault(): void }) => event.preventDefault()} value="b">
          Beta
        </Tab>
        <Tab value="c">Gamma</Tab>
      </Tabs>,
    )
    await fireEvent.press(screen.getByRole('tab', { name: 'Beta' }))
    await fireEvent.press(screen.getByRole('tab', { name: 'Gamma' }))
    expect(chosen('Alpha')).toBe(true)
  })

  test("opens a tab's link once its choice is sent, and not where the choice was refused", async () => {
    await render(
      <Tabs>
        <Tab href="/one" value="a">
          One
        </Tab>
        <Tab
          href="/two"
          onSelect={(event: { preventDefault(): void }) => event.preventDefault()}
          value="b"
        >
          Two
        </Tab>
        <Tab href="/three" value="c">
          Three
        </Tab>
      </Tabs>,
    )
    await fireEvent.press(screen.getByRole('tab', { name: 'Two' }))
    await fireEvent.press(screen.getByRole('tab', { name: 'Three' }))
    expect(opened.opened).toEqual(['/three'])
  })

  test('moves focus with the arrows and chooses where it arrives, coming round from the last', async () => {
    await render(
      <Tabs>
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
      </Tabs>,
    )
    const [first, second] = heard
    await act(() => {
      expect(keys.press(first, 'ArrowRight')).toBe(true)
    })
    expect(focus.focused()).toBe(second)
    expect(chosen('Beta')).toBe(true)
    await act(() => {
      keys.press(second, 'ArrowRight')
    })
    expect(focus.focused()).toBe(first)
  })

  test('sends the select of a tab the arrows arrive on, and keeps the choice where it is refused', async () => {
    const told: string[] = []
    await render(
      <Tabs
        onSelect={(event: { preventDefault(): void; target: { value: string } }) => {
          told.push(`set hears ${event.target.value}`)
          if (event.target.value === 'c') {
            event.preventDefault()
          }
        }}
      >
        <Tab value="a">Alpha</Tab>
        <Tab
          onSelect={(event: { detail: { value: string } }) =>
            told.push(`tab ${event.detail.value}`)
          }
          value="b"
        >
          Beta
        </Tab>
        <Tab value="c">Gamma</Tab>
      </Tabs>,
    )
    await act(() => {
      keys.press(heard[0], 'ArrowRight')
    })
    await act(() => {
      keys.press(heard[1], 'ArrowRight')
    })
    expect(told).toEqual(['tab b', 'set hears b', 'set hears c'])
    expect(focus.focused()).toBe(heard[2])
    expect(chosen('Beta')).toBe(true)
  })

  test('moves focus without choosing in a manual set', async () => {
    await render(
      <Tabs manual>
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
      </Tabs>,
    )
    await act(() => {
      keys.press(heard[0], 'ArrowRight')
    })
    expect(focus.focused()).toBe(heard[1])
    expect(chosen('Alpha')).toBe(true)
  })

  test('moves to the tab whose words start with a letter typed', async () => {
    await render(
      <Tabs>
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
        <Tab value="g">Gamma</Tab>
      </Tabs>,
    )
    await act(() => {
      expect(keys.press(heard[0], 'g')).toBe(true)
    })
    expect(focus.focused()).toBe(heard[2])
    expect(chosen('Gamma')).toBe(true)
  })

  /* As the typeahead machine passes over an item with no words, and the web
     reads the words of every element in a tab's default slot. The tab valued
     "b" has no words, so "b" passes it for "Beta", and an arrow still
     reaches it. */
  test('passes over a tab with no words for a letter, and reads the words of elements a tab holds', async () => {
    const values: string[] = []
    await render(
      <Tabs onSelect={(event: { detail: { value: string } }) => values.push(event.detail.value)}>
        <Tab value="a">Alpha</Tab>
        <Tab value="b" />
        <Tab value="x">
          <Text>
            Be<Text>ta</Text>
          </Text>
        </Tab>
      </Tabs>,
    )
    await act(() => {
      expect(keys.press(heard[0], 'b')).toBe(true)
    })
    expect(focus.focused()).toBe(heard[2])
    await act(() => {
      keys.press(heard[2], 'ArrowLeft')
    })
    expect(focus.focused()).toBe(heard[1])
    expect(values).toEqual(['x', 'b'])
  })
})

describe('behaviorFor a list', () => {
  test('chooses as many rows as its mode says, a press adding or taking one out', async () => {
    const changes: string[] = []
    await render(
      <List onChange={() => changes.push('change')} selectionMode="multiple">
        <Row value="a">Apples</Row>
        <Row value="b">Bread</Row>
      </List>,
    )
    await fireEvent.press(rowOf('Apples'))
    await fireEvent.press(rowOf('Bread'))
    expect(rowChosen('Apples')).toBe(true)
    expect(rowChosen('Bread')).toBe(true)
    await fireEvent.press(rowOf('Apples'))
    expect(rowChosen('Apples')).toBe(false)
    expect(changes).toEqual(['change', 'change', 'change'])
  })

  test('acts on a row pressed where it selects nothing, telling the row and then the list', async () => {
    const told: string[] = []
    await render(
      <List
        onAction={(event: { detail: object; target: { value: string } }) =>
          told.push(`list ${event.target.value} with ${JSON.stringify(event.detail)}`)
        }
        selectionMode="none"
      >
        <Row
          onAction={(event: { target: { value: string } }) =>
            told.push(`row ${event.target.value}`)
          }
          value="a"
        >
          Apples
        </Row>
      </List>,
    )
    await fireEvent.press(rowOf('Apples'))
    expect(told).toEqual(['row a', 'list a with {}'])
  })

  test('moves focus down its rows without choosing, stopping at the last', async () => {
    await render(
      <List selectionMode="single">
        <Row value="a">Apples</Row>
        <Row value="b">Bread</Row>
      </List>,
    )
    await act(() => {
      keys.press(heard[0], 'ArrowDown')
    })
    await act(() => {
      keys.press(heard[1], 'ArrowDown')
    })
    expect(focus.focused()).toBe(heard[1])
    expect(rowChosen('Bread')).toBe(false)
  })
})

describe('behaviorFor a button', () => {
  test('tells its press, with what pressed it', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress}>Save</Button>)
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }))
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { pointerType: 'virtual' }, target: {} }),
    )
  })

  test('tells a press from Enter on it as a press from the keyboard', async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress}>Save</Button>)
    await act(() => {
      expect(keys.press(heard[0], 'Enter')).toBe(true)
    })
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { pointerType: 'keyboard' } }),
    )
  })
})

describe('scrollingOf', () => {
  test('finds the box a scroll button pages, and the edge it pages toward', () => {
    const strip = {
      ...tabs,
      tree: [
        {
          children: [
            {
              children: [{ attributes: { scrolls: 'end' }, kind: 'pressable', name: 'scroll-end' }],
              kind: 'when',
              name: 'scroll-controls',
            },
          ],
          kind: 'box',
          name: 'tabs',
        },
      ],
    } as unknown as Family
    expect(scrollingOf(strip, 'scroll-end')).toEqual({ scroller: 'tabs', toward: 'end' })
    expect(scrollingOf(strip, 'tabs')).toBeUndefined()
  })
})
