/** The families the specs of `style` draw, each a family's shape in miniature. */
import type { Family, Rule } from './form.js'

export const rule = (
  fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>,
): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* Button's shape in miniature: a tone sets a value, the generic hover is four
   class-equivalents, and an emphasis is three and written after it. */
export const family: Family = {
  name: 'button',
  rules: [
    rule({
      order: 0,
      specificity: [0, 1, 0],
      target: 'host',
      values: [['tone', { token: 'color-foreground' }]],
    }),
    rule({
      order: 1,
      specificity: [0, 2, 0],
      target: 'host',
      values: [['tone', { token: 'color-primary' }]],
      when: [{ kind: 'attribute', name: 'tone', value: 'primary' }],
    }),
    rule({
      order: 2,
      set: [
        [
          'background-color',
          {
            hook: {
              fallback: {
                mix: {
                  first: { own: { name: 'tone' } },
                  percent: 6,
                  second: { text: 'transparent' },
                },
              },
              name: 'background-color',
            },
          },
        ],
        [
          'border',
          { space: [{ token: 'border-thin' }, { text: 'solid' }, { own: { name: 'tone' } }] },
        ],
        ['cursor', { web: { text: 'pointer' } }],
        ['padding-inline', { token: 'space-control' }],
      ],
      specificity: [0, 1, 0],
      target: 'button',
    }),
    rule({
      order: 3,
      set: [['background-color', { text: '#ff0000' }]],
      specificity: [0, 4, 0],
      target: 'button',
      when: [
        { kind: 'disabled', value: false },
        { kind: 'pseudo', names: ['hover'] },
      ],
    }),
    rule({
      order: 4,
      set: [['background-color', { text: '#00ff00' }]],
      specificity: [0, 3, 0],
      target: 'button',
      when: [{ kind: 'attribute', name: 'emphasis', value: 'solid' }],
    }),
    rule({
      order: 5,
      set: [['display', { text: 'none' }]],
      specificity: [0, 1, 0],
      target: 'host',
      webOnly: true,
    }),
  ],
  tag: 'helix-button',
  version: '2.0',
}

export const tokens = {
  'border-thin': '1px',
  'color-foreground': '#000000',
  'color-primary': '#0000ff',
  'space-control': '0.75rem',
}

/* Tabs' indicator in miniature: it sits where the selected tab was measured,
   moves the other way right to left, and shows once it is placed. */
export const indicator: Family = {
  name: 'tabs',
  rules: [
    rule({
      order: 0,
      set: [
        [
          'inline-size',
          {
            calc: {
              op: '+',
              operands: [
                { measured: { fallback: { text: '0px' }, name: 'indicator-x' } },
                { own: { fallback: { text: '0px' }, name: 'indicator-offset' } },
              ],
            },
          },
        ],
        ['opacity', { number: 0 }],
      ],
      specificity: [0, 1, 0],
      target: 'indicator',
    }),
    rule({
      order: 1,
      specificity: [0, 2, 0],
      target: 'host',
      values: [['indicator-offset', { text: '0.25rem' }]],
      when: [{ kind: 'dir', value: 'rtl' }],
    }),
    rule({
      order: 2,
      set: [['opacity', { number: 1 }]],
      specificity: [0, 2, 0],
      target: 'indicator',
      when: [{ kind: 'part', name: 'data-placed', value: true }],
    }),
    rule({
      order: 3,
      set: [['background', { function: { arguments: [], name: 'linear-gradient' } }]],
      specificity: [0, 2, 0],
      target: 'indicator',
      when: [{ kind: 'absent', name: 'variant' }],
    }),
    rule({
      order: 4,
      set: [['margin', { text: '0' }]],
      slotted: 'helix-tab',
      specificity: [0, 1, 1],
      target: 'host',
    }),
  ],
  tag: 'helix-tabs',
  version: '2.0',
}

/* Tabs' strip in miniature: the host and the strip set values, the strip
   holds the tabs and the mark, and the panels sit beside it. */
export const strip: Family = {
  name: 'tabs',
  rules: [
    rule({
      order: 0,
      set: [
        ['display', { text: 'grid' }],
        ['grid-template-rows', { text: 'auto' }],
      ],
      specificity: [0, 1, 0],
      target: 'host',
      values: [
        ['surface', { text: '#ffffff' }],
        ['rule', { text: 'none' }],
      ],
    }),
    rule({
      order: 1,
      set: [
        ['background-image', { own: { fallback: { text: 'none' }, name: 'rule' } }],
        ['background-size', { space: [{ text: '100%' }, { token: 'border-thin' }] }],
        ['background-position', { text: 'bottom' }],
      ],
      specificity: [0, 1, 0],
      target: 'tabs',
      values: [['surface', { text: '#eeeeee' }]],
    }),
    rule({
      order: 2,
      specificity: [0, 2, 0],
      target: 'host',
      values: [
        [
          'rule',
          {
            function: {
              arguments: [{ text: '#cccccc' }, { text: '#cccccc' }],
              name: 'linear-gradient',
            },
          },
        ],
      ],
      when: [{ kind: 'attribute', name: 'variant', value: 'underlined' }],
    }),
    rule({
      order: 3,
      set: [
        ['background-color', { own: { name: 'surface' } }],
        [
          'transition',
          {
            list: [
              { space: [{ text: 'translate' }, { text: '200ms' }, { text: 'ease' }] },
              { space: [{ text: 'opacity' }, { text: '120ms' }, { text: 'linear' }] },
            ],
          },
        ],
      ],
      specificity: [0, 1, 0],
      target: 'indicator',
    }),
    rule({
      order: 4,
      set: [['background-color', { own: { fallback: { text: '#000000' }, name: 'surface' } }]],
      specificity: [0, 1, 0],
      target: 'panels',
    }),
  ],
  tag: 'helix-tabs',
  tree: [
    {
      children: [
        { kind: 'region', name: 'default' },
        { kind: 'box', name: 'indicator' },
      ],
      kind: 'box',
      name: 'tabs',
    },
    { kind: 'box', name: 'panels' },
  ],
  version: '2.0',
}

/* A tab's shape in miniature: an inline host holding a press that is as
   long as the host, inside a strip that lays its children out. */
export const lengths: Family = {
  name: 'tabs-tab',
  rules: [
    rule({
      order: 0,
      set: [['display', { text: 'inline-flex' }]],
      specificity: [0, 1, 0],
      target: 'host',
    }),
    rule({
      order: 1,
      set: [
        ['inline-size', { text: '100%' }],
        ['block-size', { text: '100%' }],
      ],
      specificity: [0, 1, 0],
      target: 'tab',
    }),
  ],
  tag: 'helix-tab',
  tree: [{ kind: 'pressable', name: 'tab' }],
  version: '2.0',
}
export const row = { flex: true, row: true, tracks: [] }
