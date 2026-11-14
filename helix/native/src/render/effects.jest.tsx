/*
 * The declarations a phone draws as views of their own: a backdrop blur
 * through expo-blur behind what a part holds, a clip by `inset()` that
 * reveals part of it, and a spotlight's spread shadow as a scrim around it.
 */
import { describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { behaviorFor } from '../machines/compose'
import type { Family } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { intensityOf } from './backdrop'
import { element } from './element'

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>

/** A rule on the panel. */
const on = (order: number, set: Rule['set']): Rule => ({
  kind: 'rule',
  order,
  set,
  specificity: [0, 1, 0],
  target: 'panel',
  values: [],
  webOnly: false,
  when: [],
})

/** A family whose one part, `panel`, its rules style, holding what is passed in. */
const formOf = (set: Rule['set']): Family => ({
  api: { events: [], props: [], states: [] },
  machines: [],
  name: 'sample',
  rules: [on(0, set)],
  tag: 'helix-sample',
  tree: [
    { attributes: {}, children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'panel' },
  ],
  version: '2.0',
})

const draw = async (set: Rule['set']) => {
  const form = formOf(set)
  const Sample = element(form, behaviorFor(form))
  return await render(
    <ThemeProvider tokens={{}}>
      <Sample>
        <Text>Inside</Text>
      </Sample>
    </ThemeProvider>,
  )
}

/** The flat style of each view drawn whose props pass `test`. */
const stylesWhere = (
  drawn: Awaited<ReturnType<typeof render>>,
  test: (props: Readonly<Record<string, unknown>>) => boolean,
) =>
  drawn.container
    .queryAll((node) => test(node.props))
    .map((node) => Object.assign({}, ...[node.props.style].flat(3)) as Record<string, unknown>)

describe('a backdrop blur', () => {
  test('is a blur behind what the part holds, at its share of the theme’s largest', async () => {
    const drawn = await draw([
      ['backdrop-filter', { function: { arguments: [{ text: '16px' }], name: 'blur' } }],
      ['border-radius', { text: '12px' }],
    ])
    const blurs = drawn.container.queryAll((node) => node.props.intensity !== undefined)
    expect(blurs.map((node) => node.props.intensity)).toEqual([intensityOf(16)])
    expect(intensityOf(16)).toBe(50)
    expect(screen.getByText('Inside')).toBeTruthy()
  })
})

describe('a clip', () => {
  test('is a view inset from the part’s edges, the part standing out past it by as much', async () => {
    const drawn = await draw([
      ['clip-path', { function: { arguments: [{ text: '4px 8px' }], name: 'inset' } }],
    ])
    const frame = stylesWhere(drawn, (props) => {
      const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
      return style.overflow === 'hidden' && style.marginTop === 4
    })
    expect(frame[0]).toMatchObject({ marginLeft: 8, marginRight: 8, marginTop: 4 })
    const out = stylesWhere(drawn, (props) => {
      const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
      return style.marginTop === -4
    })
    expect(out[0]).toMatchObject({ marginBottom: -4, marginLeft: -8 })
  })

  test('measures the part before it draws an inset in a percentage, unseen until then', async () => {
    const drawn = await draw([
      ['clip-path', { function: { arguments: [{ text: '0 0 100% 0' }], name: 'inset' } }],
    ])
    const around = drawn.container.queryAll((node) => typeof node.props.onLayout === 'function')
    const unseen = stylesWhere(drawn, (props) => typeof props.onLayout === 'function')
    expect(unseen.some((style) => style.opacity === 0)).toBe(true)
    await act(async () => {
      for (const node of around) {
        fireEvent(node, 'layout', {
          nativeEvent: { layout: { height: 80, width: 200, x: 0, y: 0 } },
        })
      }
    })
    const frame = stylesWhere(drawn, (props) => {
      const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
      return style.overflow === 'hidden' && style.marginBottom === 80
    })
    expect(frame.length).toBe(1)
  })
})

describe('a spotlight', () => {
  test('is four bands as far out as the spread around the part, rounded inside, and no shadow', async () => {
    const drawn = await draw([
      ['box-shadow', { text: '0 0 0 2400px rgba(0, 0, 0, 0.5)' }],
      ['border-radius', { text: '8px' }],
    ])
    const bands = stylesWhere(drawn, (props) => {
      const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
      return style.backgroundColor === 'rgba(0, 0, 0, 0.5)' && style.position === 'absolute'
    })
    expect(bands).toEqual([
      expect.objectContaining({ height: 2400, left: -2400, right: -2400, top: -2400 }),
      expect.objectContaining({ bottom: -2400, height: 2400, left: -2400, right: -2400 }),
      expect.objectContaining({ bottom: 0, left: -2400, top: 0, width: 2400 }),
      expect.objectContaining({ bottom: 0, right: -2400, top: 0, width: 2400 }),
    ])
    /* No band is a border, which iOS draws into a picture as large as the ring. */
    expect(bands.some((style) => style.borderWidth !== undefined)).toBe(false)
    const shadowed = stylesWhere(drawn, (props) => {
      const style = Object.assign({}, ...[props.style].flat(3)) as Record<string, unknown>
      return style.boxShadow !== undefined
    })
    expect(shadowed).toEqual([])
  })
})
