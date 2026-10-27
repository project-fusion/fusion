import {
  type Environment,
  environment,
  setEnvironment,
} from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { cubicBezier, linear } from 'react-native-reanimated'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { easingOf } from './animation'
import { element } from './element'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A spinner in miniature: a ring that turns once every 800 milliseconds, and
   once every 1600 where the reader asks for reduced motion. */
const spinner: Family = {
  name: 'spinner',
  rules: [
    rule({
      order: 0,
      set: [
        [
          'animation',
          {
            space: [{ text: 'turn' }, { text: '800ms' }, { text: 'linear' }, { text: 'infinite' }],
          },
        ],
      ],
      specificity: [0, 1, 0],
      target: 'ring',
    }),
    { frames: [['to', [['rotate', { text: '1turn' }]]]], kind: 'keyframes', name: 'turn' },
    rule({
      order: 1,
      set: [['animation-duration', { text: '1600ms' }]],
      specificity: [0, 1, 0],
      target: 'ring',
      when: [{ kind: 'media', query: '(prefers-reduced-motion: reduce)' }],
    }),
  ],
  tag: 'helix-spinner',
  tree: [{ attributes: { decorative: true }, kind: 'box', name: 'ring' }],
  version: '2.0',
}

/* A badge in miniature: a count placed half its own size up and over, that
   bounces by percentages of its height on the standard curve, without end,
   and arrives by scale on the emphasized one. */
const badge: Family = {
  name: 'badge',
  rules: [
    rule({
      order: 0,
      set: [
        ['translate', { space: [{ text: '50%' }, { text: '-50%' }] }],
        ['scale', { number: 1 }],
        [
          'transition',
          {
            list: [
              {
                space: [
                  { text: 'scale' },
                  { token: 'duration-normal' },
                  { token: 'easing-emphasized' },
                ],
              },
              {
                space: [{ text: 'opacity' }, { token: 'duration-fast' }, { text: 'linear' }],
              },
            ],
          },
        ],
        [
          'animation',
          {
            space: [
              { text: 'bounce' },
              { token: 'duration-slow' },
              { token: 'easing-standard' },
              { text: 'infinite' },
            ],
          },
        ],
      ],
      specificity: [0, 1, 0],
      target: 'count',
    }),
    {
      frames: [
        ['0%, 20%, 53%, 100%', [['transform', { text: 'translateY(0)' }]]],
        ['40%, 43%', [['transform', { text: 'translateY(-30%)' }]]],
        ['70%', [['transform', { text: 'translateY(-15%)' }]]],
      ],
      kind: 'keyframes',
      name: 'bounce',
    },
    rule({
      order: 1,
      set: [['scale', { number: 0 }]],
      specificity: [0, 2, 0],
      target: 'count',
      when: [{ kind: 'state', name: 'gone' }],
    }),
    rule({
      order: 2,
      set: [['animation', { text: 'none' }]],
      specificity: [0, 1, 0],
      target: 'count',
      when: [{ kind: 'media', query: '(prefers-reduced-motion: reduce)' }],
    }),
  ],
  tag: 'helix-badge',
  tree: [{ attributes: { decorative: true }, kind: 'box', name: 'count' }],
  version: '2.0',
}

const TOKENS = {
  'duration-fast': 120,
  'duration-normal': 200,
  'duration-slow': 320,
  'easing-emphasized': 'cubic-bezier(0.3, 0, 0, 1.2)',
  'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
}

const Spinner = element(spinner, () => ({
  marks: [],
  parts: { ring: { view: { testID: 'ring' } } },
}))

const Badge = element(badge, () => ({
  marks: [],
  parts: { count: { view: { testID: 'count' } } },
}))

const Gone = element(badge, () => ({
  marks: ['gone'],
  parts: { count: { view: { testID: 'count' } } },
}))

const original: Environment = environment()

afterEach(() => {
  setEnvironment(original)
})

/** The flattened style of the view a spec finds by its test ID. */
const drawn = (id: string): Record<string, unknown> =>
  StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style)

describe('keyframes', () => {
  test('turn a part from its own rotation to their last frame, for every run', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Spinner />
      </ThemeProvider>,
    )
    expect(drawn('ring')).toMatchObject({
      animationDuration: 800,
      animationIterationCount: 'infinite',
      animationName: {
        '0%': {
          transform: [
            { translateX: 0 },
            { translateY: 0 },
            { rotate: '0deg' },
            { scaleX: 1 },
            { scaleY: 1 },
          ],
        },
        to: {
          transform: [
            { translateX: 0 },
            { translateY: 0 },
            { rotate: '360deg' },
            { scaleX: 1 },
            { scaleY: 1 },
          ],
        },
      },
      animationTimingFunction: 'linear',
    })
  })

  test('run at the pace the reduced-motion rule gives while the reader asks for it', async () => {
    const system = fakeEnvironment()
    setEnvironment(system)
    await render(
      <ThemeProvider tokens={{}}>
        <Spinner />
      </ThemeProvider>,
    )
    expect(drawn('ring').animationDuration).toBe(800)
    await act(async () => system.change({ reducedMotion: true }))
    expect(drawn('ring').animationDuration).toBe(1600)
  })

  test('move by percentages of the part, over its own place, at each stop of the frames', async () => {
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Badge />
      </ThemeProvider>,
    )
    const style = drawn('count')
    const at = (translateY: number | string) => [
      { translateX: '50%' },
      { translateY: '-50%' },
      { rotate: '0deg' },
      { scaleX: 1 },
      { scaleY: 1 },
      { translateY },
    ]
    expect(style.animationName).toEqual({
      '0%, 20%, 53%, 100%': { transform: at(0) },
      '40%, 43%': { transform: at('-30%') },
      '70%': { transform: at('-15%') },
    })
    expect(style).toMatchObject({
      animationDuration: 320,
      animationIterationCount: 'infinite',
      animationTimingFunction: cubicBezier(0.2, 0, 0, 1),
    })
  })

  test('stop where the reduced-motion rule writes `animation: none`', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Badge />
      </ThemeProvider>,
    )
    expect(drawn('count')).not.toHaveProperty('animationName')
  })
})

describe('transitions', () => {
  test('move a scale and an opacity with the duration and curve each names', async () => {
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Gone />
      </ThemeProvider>,
    )
    expect(drawn('count')).toMatchObject({
      transform: [
        { translateX: '50%' },
        { translateY: '-50%' },
        { rotate: '0deg' },
        { scaleX: 0 },
        { scaleY: 0 },
      ],
      transitionDuration: [200, 120],
      transitionProperty: ['transform', 'opacity'],
      transitionTimingFunction: [cubicBezier(0.3, 0, 0, 1.2), 'linear'],
    })
  })

  test('take no time while the reader asks for reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Badge />
      </ThemeProvider>,
    )
    expect(drawn('count').transitionDuration).toEqual([0, 0])
  })

  test('leave a part a driver moves to the driver', async () => {
    const Driven = element(badge, () => ({
      marks: [],
      parts: { count: { animated: true, view: { testID: 'count' } } },
    }))
    await render(
      <ThemeProvider tokens={TOKENS}>
        <Driven />
      </ThemeProvider>,
    )
    expect(drawn('count')).not.toHaveProperty('transitionProperty')
  })
})

describe('easingOf', () => {
  test('reads a keyword, a curve, the spring token’s stops, and steps', () => {
    expect(easingOf('ease-in-out')).toBe('ease-in-out')
    expect(easingOf('cubic-bezier(0.2, 0, 0, 1)')).toEqual(cubicBezier(0.2, 0, 0, 1))
    expect(easingOf('linear(0, 0.539, 1.043 60%, 1)')).toEqual(linear(0, 0.539, [1.043, '60%'], 1))
    expect(easingOf(undefined)).toBe('ease')
    expect(easingOf('bounce(2)')).toBe('ease')
  })
})
