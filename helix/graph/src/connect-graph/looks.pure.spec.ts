import { describe, expect, test } from 'bun:test'
import { type GraphColors, looksOf, mixRgb } from './looks.js'

const colors: GraphColors = {
  accent: 'rgb(200, 0, 200)',
  danger: 'rgb(220, 0, 0)',
  ground: 'rgb(0, 0, 0)',
  info: 'rgb(0, 120, 220)',
  ink: 'rgb(250, 250, 250)',
  line: 'rgb(100, 100, 100)',
  muted: 'rgb(150, 150, 150)',
  overlay: 'rgb(40, 40, 40)',
  primary: 'rgb(0, 0, 255)',
  series: ['rgb(255, 0, 0)', 'rgb(0, 255, 0)'],
  success: 'rgb(0, 160, 0)',
  warning: 'rgb(220, 160, 0)',
}

const groups: Record<string, string | undefined> = { a: 'work', b: 'home', c: undefined, d: 'work' }

const looks = (selected?: string, near: string[] = [], shown?: string[]) =>
  looksOf({
    colors,
    groupOf: (id) => groups[id],
    groups: ['work', 'home', 'work'],
    near: new Set(near),
    selected,
    shown: shown ? new Set(shown) : undefined,
  })

describe('mixRgb', () => {
  test('moves one color toward another by the amount', () => {
    expect(mixRgb('rgb(0, 0, 0)', 'rgb(200, 100, 50)', 0.5)).toBe('rgb(100, 50, 25)')
  })
})

describe('looksOf', () => {
  test('names every note where there is room while nothing is selected', () => {
    expect(looks().node('d').label).toBe('room')
  })

  test('colors each group from the series in the order of the groups’ names', () => {
    expect(looks().node('b').color).toBe('rgb(255, 0, 0)')
    expect(looks().node('a').color).toBe('rgb(0, 255, 0)')
    expect(looks().node('c').color).toBe(colors.muted)
  })

  test('draws the selected note in the brand color, its neighbors named, and the rest faded', () => {
    const drawn = looks('a', ['b'])
    expect(drawn.node('a')).toEqual({
      color: colors.primary,
      hidden: false,
      label: 'always',
      raised: true,
      selected: true,
    })
    expect(drawn.node('b')).toEqual({
      color: 'rgb(255, 0, 0)',
      hidden: false,
      label: 'room',
      raised: true,
      selected: false,
    })
    expect(drawn.node('d').color).toBe(mixRgb('rgb(0, 255, 0)', colors.ground, 0.75))
    expect(drawn.node('d').label).toBe('never')
  })

  test('raises the links that touch the selected note, and hides what depth leaves out', () => {
    const drawn = looks('a', ['b'], ['a', 'b'])
    expect(drawn.link('a', 'b')).toEqual({ color: colors.muted, hidden: false, raised: true })
    expect(drawn.link('b', 'd').hidden).toBe(true)
    expect(drawn.node('d').hidden).toBe(true)
  })
})
