import { describe, expect, test } from 'bun:test'
import type { Context } from './context.js'
import type { Family, Rule } from './form.js'
import { style } from './style.js'

/* `within: { host: { hover: true } }` and `within: { host: { focusWithin:
   true } }` on a part, as the compiler writes them: the web's
   `:host(:hover) [part="dismiss"]` and `:host(:focus-within) [part="dismiss"]`. */

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

const tokens = { 'color-foreground': '#000000' }

const context = (conditions: Context['conditions'] = {}): Context => ({ conditions, tokens })

const family: Family = {
  name: 'tag',
  rules: [
    rule({
      order: 0,
      set: [['opacity', { number: 0 }]],
      specificity: [0, 1, 0],
      target: 'dismiss',
    }),
    rule({
      order: 1,
      set: [['opacity', { number: 1 }]],
      specificity: [0, 2, 0],
      target: 'dismiss',
      when: [{ kind: 'within', on: [{ kind: 'pseudo', names: ['hover'] }], part: 'host' }],
    }),
    rule({
      order: 2,
      set: [['color', { text: '#0000ff' }]],
      specificity: [0, 2, 0],
      target: 'dismiss',
      when: [{ kind: 'within', on: [{ kind: 'pseudo', names: ['focus-within'] }], part: 'host' }],
    }),
  ],
  tag: 'helix-tag',
  tree: [{ attributes: { role: 'button', sends: 'press' }, kind: 'pressable', name: 'dismiss' }],
  version: '1.1',
}

describe('within the host', () => {
  test('a part rule under the host’s hover applies while the host is hovered, and not otherwise', () => {
    expect(style(family, 'dismiss', context({ hover: true })).style.opacity).toBe(1)
    expect(style(family, 'dismiss', context()).style.opacity).toBe(0)
    expect(style(family, 'dismiss', context({ hover: false })).style.opacity).toBe(0)
  })

  test('a part rule under focus within the host applies while focus is inside, and not otherwise', () => {
    expect(style(family, 'dismiss', context({ focusWithin: true })).style.color).toBe('#0000ff')
    expect(style(family, 'dismiss', context()).style.color).not.toBe('#0000ff')
    expect(style(family, 'dismiss', context({ hover: true })).style.color).not.toBe('#0000ff')
  })
})
