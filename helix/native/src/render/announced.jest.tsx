import { describe, expect, test } from '@jest/globals'
import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { Family, Node } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import type { UseBehavior } from './behavior'
import { element } from './element'

/** An element of one prop of each type, drawing `tree`. */
const family = (tree: Node[]): Family => ({
  api: {
    events: [],
    props: [
      { attribute: true, default: false, name: 'on', tier: 'headless', type: 'boolean' },
      { attribute: true, default: 0, name: 'value', tier: 'headless', type: 'number' },
      { attribute: true, default: '', name: 'words', tier: 'headless', type: 'string' },
    ],
    states: [],
  },
  name: 'sample',
  rules: [],
  tag: 'helix-sample',
  tree,
  version: '2.0',
})

/** Each part's view takes its name as its test id. */
const named =
  (...parts: string[]): UseBehavior =>
  () => ({
    marks: [],
    parts: Object.fromEntries(parts.map((part) => [part, { view: { testID: part } }])),
  })

const drawn = async (
  tree: Node[],
  props: Readonly<Record<string, unknown>>,
  ...parts: string[]
) => {
  const Sample = element(family(tree), named(...parts))
  await render(
    <ThemeProvider tokens={{}}>
      <Sample {...props} />
    </ThemeProvider>,
  )
}

const part = (name: string) => screen.getByTestId(name, { includeHiddenElements: true })

describe('roles, readings and states', () => {
  test('a meter is announced as a progress bar with its reading', async () => {
    await drawn(
      [
        {
          attributes: {
            label: 'Storage',
            role: 'meter',
            valuemax: 100,
            valuemin: 0,
            valuenow: { bind: 'value' },
            valuetext: { bind: 'words' },
          },
          kind: 'box',
          name: 'meter',
        },
      ],
      { value: 42, words: '42 of 100 GB' },
      'meter',
    )
    expect(part('meter').props.accessibilityRole).toBe('progressbar')
    expect(part('meter').props.accessibilityValue).toEqual({
      max: 100,
      min: 0,
      now: 42,
      text: '42 of 100 GB',
    })
  })

  test('a role a phone has no trait for is passed as its role, and a heading is a header', async () => {
    await drawn(
      [
        { attributes: { label: 'Totals', role: 'group' }, kind: 'box', name: 'group' },
        { attributes: { element: 'heading', level: 2 }, kind: 'box', name: 'title' },
        { attributes: { element: 'key' }, kind: 'box', name: 'key' },
        { attributes: { role: 'tabpanel' }, kind: 'box', name: 'panel' },
      ],
      {},
      'group',
      'title',
      'key',
      'panel',
    )
    expect(part('group').props.role).toBe('group')
    expect(part('group').props.accessibilityRole).toBeUndefined()
    expect(part('title').props.accessibilityRole).toBe('header')
    expect(part('key').props.accessibilityRole).toBe('keyboardkey')
    expect(part('panel').props.accessibilityRole).toBeUndefined()
    expect(part('panel').props.role).toBeUndefined()
  })

  test('a radio is checked as its attribute says, and a press that stays pressed is a toggle button', async () => {
    await drawn(
      [
        {
          attributes: { checked: { bind: 'on' }, label: 'Monthly', role: 'radio' },
          kind: 'pressable',
          name: 'radio',
        },
        {
          attributes: { label: 'Pause', pressed: { not: 'on' } },
          kind: 'pressable',
          name: 'pause',
        },
      ],
      { on: true },
      'radio',
      'pause',
    )
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked()
    expect(part('pause').props.accessibilityRole).toBe('togglebutton')
    expect(part('pause').props.accessibilityState.checked).toBe(false)
  })

  test('a part is unread while a prop makes it decorative, and an inert box takes no touch', async () => {
    await drawn(
      [
        {
          attributes: { decorative: { bind: 'on' }, role: 'separator' },
          kind: 'box',
          name: 'line',
        },
        { attributes: { decorative: { not: 'on' } }, kind: 'box', name: 'content' },
        { attributes: { inert: { bind: 'on' } }, kind: 'box', name: 'body' },
        {
          attributes: { decorative: true, lines: 2, says: { bind: 'words' } },
          kind: 'text',
          name: 'count',
        },
      ],
      { on: true, words: 'Three' },
      'line',
      'content',
      'body',
      'count',
    )
    expect(isHiddenFromAccessibility(part('line'))).toBe(true)
    expect(isHiddenFromAccessibility(part('content'))).toBe(false)
    expect(part('body').props.pointerEvents).toBe('none')
    expect(isHiddenFromAccessibility(part('body'))).toBe(true)
    expect(isHiddenFromAccessibility(part('count'))).toBe(true)
    expect(part('count').props.numberOfLines).toBe(2)
    expect(part('count').props.ellipsizeMode).toBe('tail')
  })

  test('what a decorative region holds is drawn and hidden from screen readers', async () => {
    const Sample = element(
      family([{ attributes: { decorative: true }, kind: 'region', name: 'default' }]),
    )
    await render(
      <ThemeProvider tokens={{}}>
        <Sample>Seven</Sample>
      </ThemeProvider>,
    )
    expect(screen.queryByText('Seven')).toBeNull()
    expect(screen.getByText('Seven', { includeHiddenElements: true })).toBeTruthy()
  })
})
