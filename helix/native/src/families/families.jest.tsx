/*
 * The components `helix system components` writes, drawn from the pilot's
 * real intermediate forms. `test:native` writes them beside this file, as the
 * styled package's build writes the ones it ships, and they import this
 * package by its name as those do. `typecheck` reads this file too, so each
 * `@ts-expect-error` holds a prop or a detail field to the type the
 * generator gives it.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { HelixButton, type HelixButtonPressEvent } from './button/index.native'
import { HelixList, HelixListItem } from './list/index.native'
import { HelixTab, HelixTabPanel, HelixTabs } from './tabs/index.native'

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

let opened: FakeOpenLink = fakeOpenLink()

beforeEach(() => {
  setKeys(fakeKeys<unknown>())
  setFocus(fakeFocus<unknown>())
  opened = fakeOpenLink()
  setOpenLink(opened)
})

describe('the generated Tabs', () => {
  test("hands each handler the web's detail, under `detail`", async () => {
    const told: string[] = []
    await render(
      <HelixTabs
        onActivate={(event) => told.push(`activate ${event.detail.previous}>${event.detail.value}`)}
        onBeforeActivate={(event) => told.push(`before ${event.detail.value}`)}
        onBeforeSelect={(event) => told.push(`set from ${event.target.value}`)}
        panels={[
          <HelixTabPanel key="a" value="a">
            First
          </HelixTabPanel>,
          <HelixTabPanel key="b" value="b">
            Second
          </HelixTabPanel>,
        ]}
      >
        <HelixTab onBeforeSelect={(event) => told.push(`tab ${event.detail.value}`)} value="a">
          Alpha
        </HelixTab>
        <HelixTab onBeforeSelect={(event) => told.push(`tab ${event.detail.value}`)} value="b">
          Beta
        </HelixTab>
      </HelixTabs>,
    )
    expect(chosen('Alpha')).toBe(true)
    await fireEvent.press(screen.getByRole('tab', { name: 'Beta' }))
    expect(told).toEqual(['tab b', 'set from b', 'before b', 'activate a>b'])
    expect(chosen('Beta')).toBe(true)
  })

  test('keeps its choice where a handler refuses the change', async () => {
    await render(
      <HelixTabs onBeforeActivate={(event) => event.preventDefault()}>
        <HelixTab value="a">Alpha</HelixTab>
        <HelixTab value="b">Beta</HelixTab>
      </HelixTabs>,
    )
    await fireEvent.press(screen.getByRole('tab', { name: 'Beta' }))
    expect(chosen('Alpha')).toBe(true)
  })
})

describe('the generated List', () => {
  test('chooses no row of a list with no value, where its rows have none either', async () => {
    await render(
      <HelixList divided label="Events">
        <HelixListItem>load</HelixListItem>
        <HelixListItem>error</HelixListItem>
      </HelixList>,
    )
    expect(rowOf('load').props.accessibilityState?.selected).toBe(false)
    expect(rowOf('error').props.accessibilityState?.selected).toBe(false)
  })

  test('tells a proposed selection under `detail`, which a handler may refuse', async () => {
    const proposed: string[] = []
    await render(
      <HelixList
        onBeforeChange={(event) => {
          proposed.push(event.detail.value)
          if (event.detail.value === 'b') {
            event.preventDefault()
          }
        }}
        selectionMode="single"
      >
        <HelixListItem value="a">Apples</HelixListItem>
        <HelixListItem value="b">Bread</HelixListItem>
      </HelixList>,
    )
    await fireEvent.press(rowOf('Apples'))
    await fireEvent.press(rowOf('Bread'))
    expect(proposed).toEqual(['a', 'b'])
    expect(rowOf('Apples').props.accessibilityState?.selected).toBe(true)
    expect(rowOf('Bread').props.accessibilityState?.selected).toBe(false)
  })

  test("tells a change with the list's value under `target`, as the web's `change` has it", async () => {
    const values: string[] = []
    await render(
      <HelixList onChange={(event) => values.push(event.target.value)} selectionMode="multiple">
        <HelixListItem value="a">Apples</HelixListItem>
        <HelixListItem value="b">Bread</HelixListItem>
      </HelixList>,
    )
    await fireEvent.press(rowOf('Apples'))
    await fireEvent.press(rowOf('Bread'))
    expect(values).toEqual(['a', 'a,b'])
  })

  test('tells an action with the row under `target`, to the row and then the list', async () => {
    const told: string[] = []
    await render(
      <HelixList
        onAction={(event) =>
          told.push(`list ${event.target.value} ${JSON.stringify(event.detail)}`)
        }
        selectionMode="none"
      >
        <HelixListItem onAction={(event) => told.push(`row ${event.target.value}`)} value="a">
          Apples
        </HelixListItem>
      </HelixList>,
    )
    await fireEvent.press(rowOf('Apples'))
    expect(told).toEqual(['row a', 'list a {}'])
  })

  test.each([
    ['no selection mode', undefined],
    ['none', 'none'],
    ['single', 'single'],
    ['multiple', 'multiple'],
  ] as const)(
    'follows the link of a row with href under %s, and chooses nothing',
    async (_, mode) => {
      const values: string[] = []
      await render(
        <HelixList
          onChange={(event) => values.push(event.target.value)}
          {...(mode === undefined ? {} : { selectionMode: mode })}
        >
          <HelixListItem href="/projects/website" value="website">
            Website redesign
          </HelixListItem>
        </HelixList>,
      )
      await fireEvent.press(rowOf('Website redesign'))
      expect(opened.opened).toEqual(['/projects/website'])
      expect(values).toEqual([])
    },
  )
})

describe('the generated Button', () => {
  test('tells what pressed it under `detail`', async () => {
    const onPress = jest.fn<(event: HelixButtonPressEvent) => void>()
    await render(<HelixButton onPress={onPress}>Save</HelixButton>)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress.mock.calls[0]?.[0].detail.pointerType).toBe('virtual')
  })
})

/* Made and never drawn: that each line does not compile is the assertion,
   which `typecheck` makes. */
const refused = () => [
  // @ts-expect-error A tab set runs one of two ways.
  <HelixTabs key="orientation" orientation="diagonal" />,
  // @ts-expect-error `rel` is the web element's own.
  <HelixTab key="rel" rel="noopener" />,
  <HelixTabs
    key="detail"
    onActivate={(event) => {
      // @ts-expect-error The detail's fields are under `detail`.
      event.value
      // @ts-expect-error The web's `cause` is not one a phone sends.
      event.detail.cause
      // @ts-expect-error A tab set has no value for its target to carry.
      event.target.value
    }}
  />,
  <HelixList
    key="target"
    onChange={(event) => {
      // @ts-expect-error The list's value is under `target`.
      event.value
    }}
  />,
  // @ts-expect-error A press comes from one of five kinds of pointer.
  <HelixButton key="press" onPress={(event: { detail: { pointerType: 'nose' } }) => event} />,
]

describe('the generated types', () => {
  test('refuse a value a prop does not take, a web-only prop, and a field a phone does not send', () => {
    expect(refused()).toHaveLength(5)
  })
})
