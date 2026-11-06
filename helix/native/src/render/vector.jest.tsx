import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'
import { glyphs } from './vector'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A meter's ring in miniature: a track and a fill on a circle 45 units
   round in a 100-unit box, the fill's dashes written in a path length of 100
   and moving as the value does. */
const ring: Family = {
  name: 'ring',
  rules: [
    rule({
      order: 0,
      set: [
        ['inline-size', { number: 48 }],
        ['block-size', { number: 48 }],
        ['rotate', { text: '-90deg' }],
      ],
      specificity: [0, 1, 0],
      target: 'drawing',
    }),
    rule({
      order: 1,
      set: [
        ['fill', { text: 'none' }],
        ['stroke', { text: 'currentColor' }],
        ['stroke-width', { number: 10 }],
      ],
      specificity: [0, 1, 0],
      target: 'track',
    }),
    rule({
      order: 2,
      set: [
        ['fill', { text: 'none' }],
        ['stroke', { token: 'color-primary' }],
        ['stroke-width', { number: 10 }],
        ['stroke-linecap', { text: 'round' }],
        ['stroke-dasharray', { space: [{ number: 70 }, { number: 100 }] }],
        [
          'transition',
          {
            space: [{ text: 'stroke-dasharray' }, { token: 'duration-normal' }, { text: 'linear' }],
          },
        ],
      ],
      specificity: [0, 1, 0],
      target: 'fill',
    }),
  ],
  tag: 'helix-ring',
  tree: [
    {
      attributes: { decorative: true, viewBox: '0 0 100 100' },
      children: [
        {
          attributes: { cx: '50', cy: '50', r: '45', shape: 'circle' },
          kind: 'box',
          name: 'track',
        },
        {
          attributes: { cx: '50%', cy: '50%', pathLength: '100', r: '45', shape: 'circle' },
          kind: 'box',
          name: 'fill',
        },
      ],
      kind: 'box',
      name: 'drawing',
    },
  ],
  version: '2.0',
}

const Ring = element(ring, () => ({
  marks: [],
  parts: { drawing: { view: { testID: 'drawing' } } },
}))

const TOKENS = { 'color-foreground': '#111111', 'color-primary': '#3366cc', 'duration-normal': 200 }

/** A drawn tree, as `toJSON` gives it. */
interface Drawn {
  readonly children?: readonly (Drawn | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
  readonly type: string
}

/** Each circle in a drawn tree, in order. */
const circles = (tree: Drawn | readonly Drawn[] | null): Drawn[] => {
  const nodes = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Drawn]
  return nodes.flatMap((node) => [
    ...(node.type === 'RNSVGCircle' ? [node] : []),
    ...circles(
      (node.children ?? []).filter(
        (child: Drawn | string): child is Drawn => typeof child !== 'string',
      ),
    ),
  ])
}

describe('a vector', () => {
  test('fills its box and turns with it', async () => {
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Ring />
      </ThemeProvider>,
    )
    expect(
      StyleSheet.flatten(
        screen.getByTestId('drawing', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({
      height: 48,
      transform: [{ rotate: '-90deg' }],
      width: 48,
    })
  })

  test('draws each shape at its geometry, in its paint, with a percentage of the box resolved', async () => {
    const view = await render(
      <ThemeProvider tokens={TOKENS}>
        <Ring />
      </ThemeProvider>,
    )
    const [track, fill] = circles(view.toJSON() as Drawn | null)
    expect(track?.props).toMatchObject({ cx: 50, cy: 50, fill: null, r: 45, strokeWidth: 10 })
    /* The stroke is the text's color for `currentColor`, and the token's. */
    expect(track?.props.stroke).toEqual({ payload: 0xff111111, type: 0 })
    expect(fill?.props.stroke).toEqual({ payload: 0xff3366cc, type: 0 })
    expect(fill?.props).toMatchObject({ cx: 50, cy: 50, r: 45 })
  })

  test('takes its geometry as numbers, and draws the shapes a `when` holds while it holds', async () => {
    const ticked: Family = {
      api: {
        events: [],
        props: [
          { attribute: true, default: false, name: 'banded', tier: 'headless', type: 'boolean' },
        ],
        states: [],
      },
      name: 'ticked',
      rules: [],
      tag: 'helix-ticked',
      tree: [
        {
          attributes: { decorative: true, viewBox: '0 0 100 100' },
          children: [
            { attributes: { cx: 50, cy: 50, r: 45, shape: 'circle' }, kind: 'box', name: 'groove' },
            {
              children: [
                { attributes: { cx: 50, cy: 5, r: 2, shape: 'circle' }, kind: 'box', name: 'tick' },
              ],
              kind: 'when',
              name: 'banded',
            },
          ],
          kind: 'box',
          name: 'drawing',
        },
      ],
      version: '2.0',
    }
    const Ticked = element(ticked)
    const view = await render(
      <ThemeProvider tokens={TOKENS}>
        <Ticked />
      </ThemeProvider>,
    )
    expect(circles(view.toJSON() as Drawn | null).map(({ props }) => props.r)).toEqual([45])
    await view.rerender(
      <ThemeProvider tokens={TOKENS}>
        <Ticked banded />
      </ThemeProvider>,
    )
    expect(circles(view.toJSON() as Drawn | null).map(({ props }) => props.cy)).toEqual([50, 5])
  })
})

describe('a shape’s dashes', () => {
  test('written in its path length are measured by its outline', async () => {
    const view = await render(
      <ThemeProvider tokens={TOKENS}>
        <Ring />
      </ThemeProvider>,
    )
    const [, fill] = circles(view.toJSON() as Drawn | null)
    /* 70 and 100 of a path length of 100, on a circle 2π × 45 round, **as a
       list of numbers**: Reanimated takes a moving shape's dashes only so,
       and threw on words such as `"73.89 175.929"`, which drew Progress's ring
       example as an error on a simulator and an emulator (run 38957410938). */
    expect(fill?.props.strokeDasharray).toEqual([197.92, 282.743])
  })
})

describe('glyphs', () => {
  test('draw an icon by its name, in the color and at the size asked for', async () => {
    const Glyph = glyphs((name) =>
      name === 'check' ? { content: '<path d="M2 8l4 4 8-8"/>', viewBox: '0 0 16 16' } : undefined,
    )
    const view = await render(<Glyph color="#3366cc" name="check" size={20} />)
    expect(view.toJSON()).not.toBeNull()
    await view.rerender(<Glyph color="#3366cc" name="missing" size={20} />)
    expect(view.toJSON()).toBeNull()
  })
})

describe('without react-native-svg', () => {
  test('a vector throws an error that names the package and the command that installs it', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-svg', () => {
        throw new Error('Cannot find module')
      })
      const { svg } = require('./vector') as typeof import('./vector')
      expect(() => svg()).toThrow('`npx expo install react-native-svg`')
    })
  })
})
