import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { isHiddenFromAccessibility, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'
import Reanimated from 'react-native-reanimated'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { merged, type Props, type UseBehavior } from './behavior'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* Button's tree in miniature: a press holding the label, a ring while
   pending, and words said when it starts. */
const button: Family = {
  api: {
    events: [{ cancelable: false, detail: ['pointerType'], name: 'press' }],
    props: [
      { attribute: true, default: false, name: 'pending', tier: 'headless', type: 'boolean' },
      {
        attribute: true,
        default: 'Loading',
        name: 'pending-label',
        tier: 'headless',
        type: 'string',
      },
    ],
    states: ['pending'],
  },
  name: 'button',
  rules: [
    rule({
      order: 0,
      set: [['color', { text: '#123456' }]],
      specificity: [0, 1, 0],
      target: 'button',
    }),
    rule({
      inner: '> slot',
      order: 1,
      set: [['visibility', { text: 'hidden' }]],
      specificity: [0, 3, 1],
      target: 'button',
      when: [{ kind: 'state', name: 'pending' }],
    }),
    rule({
      order: 2,
      set: [['background-color', { text: '#abcdef' }]],
      specificity: [0, 2, 0],
      target: 'button',
      when: [{ kind: 'pseudo', names: ['hover', 'active'] }],
    }),
  ],
  tag: 'helix-button',
  tree: [
    {
      attributes: { busy: { bind: 'pending' }, role: 'button', sends: 'press' },
      children: [
        { attributes: { part: 'text' }, kind: 'region', name: 'default' },
        {
          children: [{ attributes: { decorative: true }, kind: 'box', name: 'spinner' }],
          kind: 'when',
          name: 'pending',
        },
      ],
      kind: 'pressable',
      name: 'button',
    },
    {
      attributes: { says: { bind: 'pending-label' }, while: { bind: 'pending' } },
      kind: 'live',
      name: 'live',
    },
  ],
  version: '1.0',
}

/** A behavior that gives each named part a test ID, and nothing else. */
const tagged =
  (...parts: string[]): UseBehavior =>
  () => ({
    marks: [],
    parts: Object.fromEntries(parts.map((part) => [part, { view: { testID: part } }])),
  })

/** Draws `family` with `props` under a theme whose foreground is black. */
const draw = async (family: Family, props: Props = {}, useBehavior?: UseBehavior) => {
  const Drawn = element(family, useBehavior)
  await render(
    <ThemeProvider tokens={{ 'color-foreground': '#000000' }}>
      <Drawn {...props} />
    </ThemeProvider>,
  )
}

describe('element', () => {
  test('draws the press with its role, and the label as text in the press’s color', async () => {
    await draw(button, { children: 'Save' })
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeBusy()
    expect(screen.getByText('Save')).toHaveStyle({ color: '#123456' })
  })

  test('while pending, the label is hidden, the ring is drawn, and the press is busy', async () => {
    await draw(button, { children: 'Save', pending: true }, tagged('spinner'))
    const press = screen.getByRole('button')
    expect(press).toBeBusy()
    expect(press).toBeDisabled()
    expect(screen.getByText('Save')).toHaveStyle({ opacity: 0 })
    const ring = screen.getByTestId('spinner', { includeHiddenElements: true })
    expect(isHiddenFromAccessibility(ring)).toBe(true)
  })

  test('a binding’s view is laid over its part, and its states are conditions of the part', async () => {
    await draw(button, { children: 'Save' }, () => ({
      marks: [],
      parts: {
        button: {
          states: { active: true },
          view: { accessibilityHint: 'Saves the draft', style: { margin: 3 } },
        },
      },
    }))
    const press = screen.getByRole('button')
    expect(press.props.accessibilityHint).toBe('Saves the draft')
    expect(press).toHaveStyle({ backgroundColor: '#abcdef', margin: 3 })
  })

  test('the element’s marks are conditions of every part and values its attributes read', async () => {
    await draw(button, { children: 'Save' }, () => ({
      marks: ['pending'],
      parts: { spinner: { view: { testID: 'spinner' } } },
    }))
    expect(screen.getByRole('button')).toBeBusy()
    expect(screen.getByText('Save')).toHaveStyle({ opacity: 0 })
    expect(screen.getByTestId('spinner', { includeHiddenElements: true })).toBeOnTheScreen()
  })

  test('the host’s binding is laid over the element’s own view', async () => {
    await draw(button, { children: 'Save' }, () => ({
      marks: [],
      parts: { host: { view: { testID: 'host' } } },
    }))
    expect(screen.getByTestId('host')).toContainElement(screen.getByRole('button'))
  })

  /* A web page's `body` gives every element its color. Native text has no
     page, and it was black, unreadable on a dark surface. */
  test('words no rule colors are in the page color', async () => {
    const plain: Family = {
      name: 'plain',
      rules: [],
      tag: 'helix-plain',
      tree: [{ kind: 'region', name: 'default' }],
      version: '1.0',
    }
    await draw(plain, { children: 'Words' })
    expect(screen.getByText('Words')).toHaveStyle({ color: '#000000' })
  })

  test('refuses a form in a major it does not read', () => {
    expect(() => element({ ...button, version: '2.0' })).toThrow(
      'button: the intermediate form is version 2.0, and this runtime reads 1.x',
    )
  })
})

/* A track in miniature: a box holding a mark, and a ring CSS centers over it. */
const track: Family = {
  name: 'track',
  rules: [
    rule({
      order: 0,
      set: [
        ['inset', { number: 0 }],
        ['margin', { text: 'auto' }],
        ['position', { text: 'absolute' }],
      ],
      specificity: [0, 1, 0],
      target: 'ring',
    }),
  ],
  tag: 'helix-track',
  tree: [
    {
      children: [
        { kind: 'box', name: 'mark' },
        { kind: 'box', name: 'ring' },
      ],
      kind: 'box',
      name: 'track',
    },
  ],
  version: '1.0',
}

/**
 * Has Reanimated's view mark what it draws, by a test ID that names it.
 * Reanimated's mock draws its view as React Native's own.
 */
const reanimated = () =>
  jest
    .spyOn(Reanimated, 'View')
    .mockImplementation(((props: ViewProps) => (
      <View {...props} testID={`reanimated ${props.testID}`} />
    )) as never)

/** A wrap that draws a view named `id` around what it wraps. */
const around =
  (id: string) =>
  (view: ReactNode): ReactNode => <View testID={id}>{view}</View>

afterEach(() => {
  jest.restoreAllMocks()
})

describe('a binding for a part a driver moves', () => {
  test('draws a box it asks to animate as Reanimated’s view, with its style over the box’s own', async () => {
    reanimated()
    await draw(track, {}, () => ({
      marks: [],
      parts: {
        mark: { animated: true, view: { style: { width: 40 }, testID: 'mark' } },
        track: { view: { testID: 'track' } },
      },
    }))
    expect(screen.getByTestId('reanimated mark')).toHaveStyle({ width: 40 })
    expect(screen.getByTestId('track')).toBeOnTheScreen()
  })

  test('draws the host, and the layer of a centered box, as Reanimated’s views where asked', async () => {
    reanimated()
    await draw(track, {}, () => ({
      marks: [],
      parts: {
        host: { animated: true, view: { testID: 'host' } },
        ring: { animated: true, view: { testID: 'ring' } },
      },
    }))
    expect(screen.getByTestId('reanimated host')).toContainElement(
      screen.getByTestId('reanimated ring'),
    )
  })

  test('draws what a binding wraps around its part’s view, and around the host', async () => {
    const errors = jest.spyOn(console, 'error')
    await draw(button, { children: 'Save' }, () => ({
      marks: [],
      parts: { button: { wrap: around('press') }, host: { wrap: around('element') } },
    }))
    expect(screen.getByTestId('press')).toContainElement(screen.getByRole('button'))
    expect(screen.getByTestId('element')).toContainElement(screen.getByTestId('press'))
    expect(errors).not.toHaveBeenCalled()
  })

  test('merged, animates a part any binding asks to, and keeps each wrap, the earlier outermost', async () => {
    reanimated()
    await draw(track, {}, () =>
      merged(
        { marks: [], parts: { mark: { animated: true, wrap: around('outer') } } },
        { marks: [], parts: { mark: { view: { testID: 'mark' }, wrap: around('inner') } } },
      ),
    )
    expect(screen.getByTestId('outer')).toContainElement(screen.getByTestId('inner'))
    expect(screen.getByTestId('inner')).toContainElement(screen.getByTestId('reanimated mark'))
  })
})
