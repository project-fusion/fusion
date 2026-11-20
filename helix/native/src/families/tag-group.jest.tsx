/*
 * The generated Tag Group, drawn from its real intermediate form with the
 * generated Tag: a group named by its label, the selection a press and the
 * keys move, a tag standing for its words where it has no value, the keys
 * that select, clear and remove, and where focus goes once the page takes a
 * tag out. `test:native` writes the components beside this file, as the
 * styled package's build writes the ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { type ReactNode, useState } from 'react'
import { Text } from 'react-native'
import { mix } from '../style/color'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { nodes, styleOf } from './drawn'
import { HelixTag, HelixTagGroup, type HelixTagGroupProps } from './tag/index.native'

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
let opened: FakeOpenLink = fakeOpenLink()
/* The tags listening for keys, in the order they started. */
let heard: unknown[] = []

beforeEach(() => {
  focus = fakeFocus<unknown>()
  setFocus(focus)
  opened = fakeOpenLink()
  setOpenLink(opened)
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
})

/** The theme's tokens, handed out of the tree. */
let tokens: Readonly<Record<string, number | string>> = {}
const Tokens = () => {
  tokens = useTokens()
  return null
}

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Tokens />
  </HelixTheme>
)

/** A rendered view, as Testing Library finds it. */
type Found = ReturnType<typeof screen.getByText>

/** The press a touch on these words lands on: the tag's one press. */
const pressOf = (words: string): Found => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's instances are untyped
  let at: any = screen.getByText(words)
  while (at !== null && typeof at.props.onResponderGrant !== 'function') {
    at = at.parent
  }
  return at
}

/** The words of each tag a screen reader hears selected, in order. */
const selected = (): string[] =>
  nodes(screen.toJSON())
    .filter((node) => (node.props.accessibilityState as { selected?: boolean })?.selected)
    .map((node) => {
      const words = nodes(node).find((one) => one.type === 'Text')
      return String(words?.children?.[0] ?? '')
    })

/** Presses `key` on the tag that started listening `at`th, with what is held. */
const pressKey = (
  at: number,
  key: string,
  held: { readonly control?: boolean; readonly shift?: boolean } = {},
) =>
  act(() => void keys.press(heard[at], key, { alt: false, control: false, shift: false, ...held }))

/** Three filters, the last disabled. */
const Filters = (props: HelixTagGroupProps) =>
  themed(
    <HelixTagGroup label="Filters" {...props}>
      <HelixTag value="open">Open</HelixTag>
      <HelixTag value="mine">Mine</HelixTag>
      <HelixTag value="late">Late</HelixTag>
      <HelixTag disabled value="old">
        Archived
      </HelixTag>
    </HelixTagGroup>,
  )

describe('a tag group', () => {
  test('is a group named by its label, and each tag one press', async () => {
    await render(<Filters />)
    const group = nodes(screen.toJSON()).filter((node) => node.props.role === 'group')
    expect(group.map((node) => node.props.accessibilityLabel)).toEqual(['Filters'])
    expect(selected()).toEqual([])
  })

  test('selects on a press where it selects, asking first, then telling', async () => {
    const told: string[] = []
    await render(
      <Filters
        onBeforeChange={(event) => told.push(`before-change ${event.detail.value}`)}
        onChange={(event) => told.push(`change ${event.target.value}`)}
        selectionMode="multiple"
      />,
    )
    await fireEvent.press(pressOf('Open'))
    await fireEvent.press(pressOf('Late'))
    expect(selected()).toEqual(['Open', 'Late'])
    expect(told).toEqual([
      'before-change open',
      'change open',
      'before-change open,late',
      'change open,late',
    ])
  })

  test('writes the value in the order the tags were pressed, and a range or every tag in tag order', async () => {
    const told: string[] = []
    await render(
      <Filters onChange={(event) => told.push(event.target.value)} selectionMode="multiple" />,
    )
    await fireEvent.press(pressOf('Mine'))
    await fireEvent.press(pressOf('Open'))
    await pressKey(2, ' ', { shift: true })
    await pressKey(2, 'Escape')
    for (const words of ['Late', 'Open', 'Mine', 'Open']) {
      await fireEvent.press(pressOf(words))
    }
    await pressKey(0, 'a', { control: true })
    expect(told).toEqual([
      'mine',
      'mine,open',
      'open,mine,late',
      '',
      'late',
      'late,open',
      'late,open,mine',
      'late,mine',
      'open,mine,late',
    ])
  })

  test('keeps one tag selected under `disallowEmptySelection`, and refuses a refused change', async () => {
    const view = await render(<Filters disallowEmptySelection selectionMode="single" />)
    await fireEvent.press(pressOf('Open'))
    await fireEvent.press(pressOf('Open'))
    expect(selected()).toEqual(['Open'])
    await view.rerender(
      <Filters onBeforeChange={(event) => event.preventDefault()} selectionMode="single" />,
    )
    await fireEvent.press(pressOf('Mine'))
    expect(selected()).toEqual(['Open'])
  })

  test('stands a tag with no value for its words, its category first', async () => {
    const told: string[] = []
    await render(
      themed(
        <HelixTagGroup
          label="Filters"
          onChange={(event) => told.push(event.target.value)}
          selectionMode="multiple"
        >
          <HelixTag start={<Text>Priority</Text>}>High</HelixTag>
        </HelixTagGroup>,
      ),
    )
    await fireEvent.press(pressOf('High'))
    expect(told).toEqual(['Priority High'])
  })

  test('fills a selected tag with its tone, as `solid` does', async () => {
    await render(<Filters selectionMode="single" value="mine" />)
    const host = pressOf('Mine').parent
    expect(styleOf(host as Found).backgroundColor).toBe(
      mix(String(tokens['color-foreground-muted']), 82, String(tokens['color-foreground'])),
    )
  })
})

describe('the keys of a tag group', () => {
  test('move focus without selecting, stop at the ends, and pass over a disabled tag', async () => {
    await render(<Filters selectionMode="multiple" />)
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[1])
    await pressKey(1, 'End')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'm')
    expect(focus.focused()).toBe(heard[1])
    expect(selected()).toEqual([])
  })

  test('select with Space and Enter, every tag with Control and A, and none with Escape alone', async () => {
    await render(<Filters selectionMode="multiple" />)
    await pressKey(0, ' ')
    await pressKey(1, 'Enter')
    expect(selected()).toEqual(['Open', 'Mine'])
    await pressKey(1, 'a', { control: true })
    expect(selected()).toEqual(['Open', 'Mine', 'Late'])
    await pressKey(1, 'Escape', { control: true })
    expect(selected()).toEqual(['Open', 'Mine', 'Late'])
    await pressKey(1, 'Escape')
    expect(selected()).toEqual([])
  })

  test('Control with Space adds a tag only under `replace` in `multiple`, as the web’s does', async () => {
    const view = await render(<Filters selectionMode="multiple" />)
    await pressKey(0, ' ', { control: true })
    expect(selected()).toEqual([])
    await view.rerender(<Filters selectionBehavior="replace" selectionMode="single" />)
    await pressKey(0, ' ', { control: true })
    expect(selected()).toEqual([])
    await view.rerender(<Filters selectionBehavior="replace" selectionMode="multiple" />)
    await pressKey(0, ' ')
    await pressKey(1, ' ', { control: true })
    expect(selected()).toEqual(['Open', 'Mine'])
  })

  test('Shift with an arrow selects a range in place of the last one, and an arrow alone keeps the anchor', async () => {
    await render(<Filters selectionMode="multiple" />)
    await pressKey(2, ' ')
    await pressKey(0, ' ')
    await pressKey(0, 'ArrowRight', { shift: true })
    expect(selected()).toEqual(['Open', 'Mine', 'Late'])
    await pressKey(1, 'ArrowLeft', { shift: true })
    expect(selected()).toEqual(['Open', 'Late'])
    await pressKey(0, 'ArrowRight')
    await pressKey(1, 'ArrowLeft', { shift: true })
    expect(selected()).toEqual(['Open', 'Late'])
  })

  test('follow a tag’s link with Enter', async () => {
    await render(
      themed(
        <HelixTagGroup label="Links" selectionMode="multiple">
          <HelixTag href="/labels" value="labels">
            Labels
          </HelixTag>
        </HelixTagGroup>,
      ),
    )
    await pressKey(0, 'Enter')
    expect(opened.opened).toEqual(['/labels'])
  })

  test('a press on a link tag opens it and selects nothing, as a press on the web’s link does', async () => {
    await render(
      themed(
        <HelixTagGroup label="Links" selectionMode="multiple">
          <HelixTag href="/labels" value="labels">
            Labels
          </HelixTag>
          <HelixTag value="open">Open</HelixTag>
        </HelixTagGroup>,
      ),
    )
    await fireEvent.press(pressOf('Labels'))
    expect([opened.opened, selected()]).toEqual([['/labels'], []])
    await pressKey(0, ' ')
    expect(selected()).toEqual(['Labels'])
  })
})

/** A group whose page removes a tag once it asks to go, as an app's list does. */
const Removing = ({
  group,
  told,
}: {
  readonly group?: HelixTagGroupProps
  readonly told: string[]
}) => {
  const [shown, setShown] = useState(['Open', 'Mine', 'Late'])
  return themed(
    <HelixTagGroup
      label="Filters"
      {...group}
      onDismiss={(event) => {
        told.push(`group ${event.detail.label}`)
        setShown((before) => before.filter((one) => one !== event.detail.label))
      }}
    >
      {shown.map((one) => (
        <HelixTag
          dismissible
          key={one}
          onDismiss={(event) => told.push(`tag ${event.detail.label}`)}
          value={one}
        >
          {one}
        </HelixTag>
      ))}
    </HelixTagGroup>,
  )
}

describe('removing a tag', () => {
  test('Delete or Backspace sends the tag’s dismiss, then the group’s', async () => {
    const told: string[] = []
    await render(<Removing told={told} />)
    await act(() => focus.place(heard[0]))
    await pressKey(0, 'Delete')
    expect(told).toEqual(['tag Open', 'group Open'])
    expect(screen.queryByText('Open')).toBeNull()
  })

  test('hands focus to the next tag, to the one before after the last, and to the empty part', async () => {
    const told: string[] = []
    await render(<Removing told={told} />)
    const [open, mine, late] = heard
    await act(() => focus.place(mine))
    await pressKey(1, 'Backspace')
    expect(focus.focused()).toBe(late)
    await pressKey(2, 'Delete')
    expect(focus.focused()).toBe(open)
    await pressKey(0, 'Delete')
    expect(screen.getByText('No tags')).toBeTruthy()
    /* The empty part, one element a screen reader reaches, holding the words. */
    const empty = focus.focused() as { readonly props?: Readonly<Record<string, unknown>> } | null
    expect(heard).not.toContain(empty)
    expect(empty?.props?.accessible).toBe(true)
  })

  test('the remove action of a tag in a group reaches the group too', async () => {
    const told: string[] = []
    await render(<Removing told={told} />)
    await fireEvent(pressOf('Late'), 'accessibilityAction', {
      nativeEvent: { actionName: 'dismiss' },
    })
    expect(told).toEqual(['tag Late', 'group Late'])
  })

  test('takes a selected tag that is removed out of the value, and tells the change', async () => {
    const told: string[] = []
    await render(
      <Removing
        group={{
          onChange: (event) => told.push(`change ${event.target.value}`),
          selectionMode: 'multiple',
          value: 'Open,Late',
        }}
        told={told}
      />,
    )
    await pressKey(0, 'Delete')
    expect(told).toEqual(['tag Open', 'group Open', 'change Late'])
    expect(selected()).toEqual(['Late'])
  })

  test('leaves the rest of the value in the order the tags were pressed', async () => {
    const told: string[] = []
    const group = {
      onChange: (event: { target: { value: string } }) => told.push(event.target.value),
      selectionMode: 'multiple' as const,
    }
    await render(<Removing group={group} told={[]} />)
    for (const words of ['Late', 'Mine', 'Open']) {
      await fireEvent.press(pressOf(words))
    }
    await pressKey(1, 'Delete')
    expect(told).toEqual(['Late', 'Late,Mine', 'Late,Mine,Open', 'Late,Open'])
  })
})
