import { describe, expect, test } from 'bun:test'
import type { Family, Rule } from './form.js'
import { family, indicator, rule, tokens } from './style.fixtures.js'
import { style } from './style.js'

describe('style, which rules apply', () => {
  test('a hover outranks an emphasis written after it, as a browser ranks them', () => {
    const { style: hovered } = style(family, 'button', {
      conditions: { emphasis: 'solid', hover: true },
      tokens,
    })
    expect(hovered.backgroundColor).toBe('#ff0000')
    const { style: resting } = style(family, 'button', {
      conditions: { emphasis: 'solid' },
      tokens,
    })
    expect(resting.backgroundColor).toBe('#00ff00')
  })

  test('a rule for any of several interactions applies under each of them', () => {
    const pressed: Family = {
      name: 'button',
      rules: [
        rule({
          order: 0,
          set: [['background-color', { text: '#ff0000' }]],
          specificity: [0, 2, 0],
          target: 'button',
          when: [{ kind: 'pseudo', names: ['hover', 'active'] }],
        }),
      ],
      tag: 'helix-button',
      version: '1.0',
    }
    for (const interaction of ['hover', 'active']) {
      expect(
        style(pressed, 'button', { conditions: { [interaction]: true }, tokens }).style
          .backgroundColor,
      ).toBe('#ff0000')
    }
    expect(
      style(pressed, 'button', { conditions: {}, tokens }).style.backgroundColor,
    ).toBeUndefined()
  })

  test('a tone sets the value its rules read, and a hook set from outside wins', () => {
    const { style: primary } = style(family, 'button', { conditions: { tone: 'primary' }, tokens })
    expect(primary.backgroundColor).toBe('rgba(0, 0, 255, 0.06)')
    expect(primary.borderColor).toBe('#0000ff')
    const { style: hooked } = style(family, 'button', {
      conditions: {},
      hooks: { 'background-color': '#123456' },
      tokens,
    })
    expect(hooked.backgroundColor).toBe('#123456')
  })

  test('an inline box keeps its content width, and a later block stretches again', () => {
    const host = (when: Rule['when']): Family => ({
      name: 'button',
      rules: [
        rule({
          order: 0,
          set: [['display', { text: 'inline-flex' }]],
          specificity: [0, 1, 0],
          target: 'host',
        }),
        rule({
          order: 1,
          set: [['display', { text: 'flex' }]],
          specificity: [0, 2, 0],
          target: 'host',
          when,
        }),
      ],
      tag: 'helix-button',
      version: '1.0',
    })
    const full = [{ kind: 'attribute', name: 'width', value: 'full' }] as const
    expect(style(host(full), 'host', { conditions: {}, tokens }).style).toMatchObject({
      alignSelf: 'flex-start',
      display: 'flex',
      flexDirection: 'row',
    })
    expect(
      style(host(full), 'host', { conditions: { width: 'full' }, tokens }).style.alignSelf,
    ).toBeUndefined()
  })

  test('a web-only rule never reaches a native view', () => {
    expect(style(family, 'host', { conditions: {}, tokens }).style.display).toBeUndefined()
  })

  test("a part's own state, and a prop left unset, choose rules", () => {
    expect(
      style(indicator, 'indicator', { conditions: {}, part: { 'data-placed': true }, tokens }).style
        .opacity,
    ).toBe(1)
    expect(style(indicator, 'indicator', { conditions: {}, tokens }).dropped).toContain(
      'background: linear-gradient() has no native equivalent yet',
    )
    expect(
      style(indicator, 'indicator', { conditions: { variant: 'segmented' }, tokens }).dropped,
    ).not.toContain('background: linear-gradient() has no native equivalent yet')
  })
})
