/*
 * The generated Toolbar, drawn from its real intermediate form with the real
 * Button, Icon Button, Button Group, Checkbox, and Divider: a toolbar a
 * screen reader hears by its label, whose arrow keys move focus among the
 * controls inside it along the way it runs and come round from the last,
 * which gives its axis to a divider in it, sets its controls at the small
 * size, and is a group of another toolbar it sits in. `test:native` writes
 * the components beside this file, as the styled package's build writes the
 * ones it ships.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixButton } from './button/index.native'
import { HelixButtonGroup } from './button-group/index.native'
import { HelixCheckbox } from './checkbox/index.native'
import { HelixDivider } from './divider/index.native'
import { HelixIcon } from './icon/index.native'
import { HelixIconButton } from './icon-button/index.native'
import { HelixToolbar, type HelixToolbarProps } from './toolbar/index.native'

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The views listening for keys, each once, in the order they first started. */
let heard: unknown[] = []

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  focus = fakeFocus<unknown>()
  setFocus(focus)
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
})

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    <Token name="size-control-md" />
    <Token name="size-control-sm" />
    <Token name="size-icon-sm" />
    <Token name="space-2xs" />
  </HelixTheme>
)

/** A token's value, as the theme drew it, as a number. */
const token = (name: string): number =>
  Number(
    String(screen.getByTestId(new RegExp(`^token ${name} `)).props.testID).slice(
      `token ${name} `.length,
    ),
  )

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** A drawn tree, as `toJSON` gives it. */
interface Json {
  readonly children?: readonly (Json | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: string
}

/** Each view in a drawn tree, depth first. */
const views = (tree: Json | readonly Json[] | null = screen.toJSON() as Json | null): Json[] => {
  const nodes: readonly Json[] = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Json]
  return nodes.flatMap((node) => [
    node,
    ...views((node.children ?? []).filter((child): child is Json => typeof child !== 'string')),
  ])
}

/** Each view a screen reader hears as `role`, by React Native's trait or its ARIA role. */
const withRole = (role: string): Json[] =>
  views().filter((node) => node.props.accessibilityRole === role || node.props.role === role)

/** The host of each divider: the view its separator is drawn in. */
const dividers = (): Json[] =>
  views().filter((node) =>
    (node.children ?? []).some(
      (child: Json | string) => typeof child !== 'string' && child.props.role === 'separator',
    ),
  )

/** Presses `key` on the view that started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heard[at], key))

/** Bold, Italic, and Link, with a divider before Link. */
const Format = (props: HelixToolbarProps & { readonly italic?: boolean }) =>
  themed(
    <HelixToolbar label="Text formatting" {...props}>
      <HelixIconButton label="Bold">
        <HelixIcon name="text-b" />
      </HelixIconButton>
      <HelixIconButton disabled={props.italic === false} label="Italic">
        <HelixIcon name="text-italic" />
      </HelixIconButton>
      <HelixDivider />
      <HelixIconButton label="Link">
        <HelixIcon name="link" />
      </HelixIconButton>
    </HelixToolbar>,
  )

describe('the generated Toolbar', () => {
  test('is a toolbar named by its label, and by nothing until it is given one', async () => {
    const view = await render(<Format />)
    expect(withRole('toolbar').map((node) => node.props.accessibilityLabel)).toEqual([
      'Text formatting',
    ])
    await view.rerender(themed(<HelixToolbar />))
    expect(withRole('toolbar').map((node) => node.props.accessibilityLabel || undefined)).toEqual([
      undefined,
    ])
  })

  test('moves focus to the next control with Right and back with Left, from the last round to the first', async () => {
    await render(<Format />)
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[1])
    await pressKey(1, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'ArrowRight')
    expect(focus.focused()).toBe(heard[0])
    await pressKey(0, 'ArrowLeft')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'Home')
    expect(focus.focused()).toBe(heard[0])
    await pressKey(0, 'End')
    expect(focus.focused()).toBe(heard[2])
  })

  test('leaves Up and Down to its controls while it runs along a row', async () => {
    await render(<Format />)
    await pressKey(0, 'ArrowDown')
    await pressKey(0, 'ArrowUp')
    expect(focus.moved).toEqual([])
  })

  test('moves with Down and Up in a column, and leaves Left and Right to its controls', async () => {
    await render(<Format orientation="vertical" />)
    await pressKey(0, 'ArrowRight')
    expect(focus.moved).toEqual([])
    await pressKey(0, 'ArrowDown')
    expect(focus.focused()).toBe(heard[1])
    await pressKey(1, 'ArrowUp')
    expect(focus.focused()).toBe(heard[0])
  })

  test('stops at the ends under `stopAtEnds`', async () => {
    await render(<Format stopAtEnds />)
    await pressKey(2, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(0, 'ArrowLeft')
    expect(focus.focused()).toBe(heard[0])
  })

  test('passes over a disabled control and a divider, which take no focus', async () => {
    await render(<Format italic={false} />)
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
  })

  test('keeps a disabled control that is focusable when disabled as a stop of its arrows', async () => {
    await render(
      themed(
        <HelixToolbar label="Text formatting">
          <HelixIconButton label="Bold">
            <HelixIcon name="text-b" />
          </HelixIconButton>
          <HelixIconButton disabled focusableWhenDisabled label="Italic">
            <HelixIcon name="text-italic" />
          </HelixIconButton>
          <HelixIconButton label="Link">
            <HelixIcon name="link" />
          </HelixIconButton>
        </HelixToolbar>,
      ),
    )
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[1])
    await pressKey(1, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
  })

  test('walks a button group’s buttons and a checkbox as controls of its own', async () => {
    await render(
      themed(
        <HelixToolbar label="Edit">
          <HelixButton>Save</HelixButton>
          <HelixButtonGroup label="Align" selectionMode="multiple">
            <HelixButton value="left">Left</HelixButton>
            <HelixButton value="right">Right</HelixButton>
          </HelixButtonGroup>
          <HelixCheckbox>Wrap</HelixCheckbox>
        </HelixToolbar>,
      ),
    )
    /* Inside a toolbar the group is a group, and its buttons the toolbar's. */
    expect(screen.getByLabelText('Align').props.role).toBe('group')
    await pressKey(0, 'ArrowRight')
    expect(focus.focused()).toBe(heard[1])
    await pressKey(1, 'ArrowRight')
    expect(focus.focused()).toBe(heard[2])
    await pressKey(2, 'ArrowRight')
    expect(focus.focused()).toBe(heard[3])
    await pressKey(3, 'ArrowRight')
    expect(focus.focused()).toBe(heard[0])
  })

  test('is a group of a toolbar around it, whose arrows walk its controls and on past them', async () => {
    await render(
      themed(
        <HelixToolbar label="Outer">
          <HelixButton>Cut</HelixButton>
          <HelixToolbar label="History" orientation="vertical">
            <HelixButton>Undo</HelixButton>
            <HelixButton>Redo</HelixButton>
          </HelixToolbar>
          <HelixButton>Paste</HelixButton>
        </HelixToolbar>,
      ),
    )
    expect(withRole('toolbar').map((node) => node.props.accessibilityLabel)).toEqual(['Outer'])
    expect(withRole('group').map((node) => node.props.accessibilityLabel)).toEqual(['History'])
    for (const at of [0, 1, 2]) {
      await pressKey(at, 'ArrowRight')
      expect(focus.focused()).toBe(heard[at + 1])
    }
    /* The inner toolbar still runs its own way. */
    const inner = withRole('group')[0] as Json
    expect(styleOf(inner)).toMatchObject({ flexDirection: 'column' })
  })

  test('gives its axis to a divider in it: across a row, and along a column', async () => {
    const view = await render(<Format />)
    expect(styleOf(dividers()[0])).toMatchObject({ flexDirection: 'column' })
    await view.rerender(<Format orientation="vertical" />)
    expect(styleOf(dividers()[0])).toMatchObject({ alignSelf: 'stretch', flexDirection: 'row' })
  })

  test('draws no frame, lays its controls in a row with a small gap, and in a column when vertical', async () => {
    const view = await render(<Format />)
    const bar = withRole('toolbar')[0]
    expect(styleOf(bar)).toMatchObject({
      alignItems: 'center',
      borderWidth: 0,
      flexDirection: 'row',
      gap: token('space-2xs'),
    })
    await view.rerender(<Format orientation="vertical" />)
    expect(styleOf(withRole('toolbar')[0])).toMatchObject({ flexDirection: 'column' })
  })

  test('sets its controls at the small size, larger with `size`, stopping at 1.353 times', async () => {
    const view = await render(
      themed(
        <HelixToolbar label="Edit">
          <HelixButton>Save</HelixButton>
        </HelixToolbar>,
      ),
    )
    const save = () => styleOf(screen.getByRole('button', { name: 'Save' }))
    expect(save().height).toBe(token('size-control-sm'))
    await view.rerender(
      themed(
        <HelixToolbar label="Edit" size="md">
          <HelixButton>Save</HelixButton>
        </HelixToolbar>,
      ),
    )
    const medium = token('size-control-md')
    expect(save().height).toBe(medium)
    await act(() => atTextSize(3.571))
    expect(save().minHeight).toBeCloseTo(medium * 1.353, 1)
  })
})
