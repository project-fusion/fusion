/*
 * List and List Item in miniature, bound as the expansion binds a list whose
 * rows move, for the specs of the native reorder binder. Neutral builds no
 * forms before its specs run, so these are written by hand to the shape
 * `helix family build` writes.
 */
import type { Family } from '../style/form'

/** A prop, as the form writes one. */
const prop = (name: string, value: unknown = '') => ({
  attribute: true,
  default: value,
  name,
  tier: 'headless',
  type: typeof value === 'boolean' ? 'boolean' : 'string',
})

/* A list whose rows move, bound as the expansion binds List. */
export const shelf = {
  api: {
    collection: {
      after: 'change',
      before: 'before-change',
      behavior: 'selection-behavior',
      chosen: 'value',
      keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
      mode: 'selection-mode',
      reorder: {
        after: 'reorder',
        before: 'before-reorder',
        canceled: 'canceled-label',
        dropped: 'dropped-label',
        enabled: 'reorderable',
        move: 'move-label',
        moved: 'moved-label',
        picked: 'picked-up-label',
        preview: 'drag-preview',
      },
    },
    events: [
      { cancelable: false, detail: [], name: 'action' },
      { cancelable: true, detail: ['value'], name: 'before-change' },
      { cancelable: true, detail: ['keys'], name: 'before-reorder' },
      { bare: true, cancelable: false, detail: [], name: 'change' },
      { cancelable: true, detail: ['keys'], name: 'reorder' },
    ],
    props: [
      prop('reorderable', false),
      prop('selection-behavior', 'toggle'),
      prop('selection-mode'),
      prop('value'),
      prop('canceled-label', 'Canceled'),
      prop('dropped-label', 'Dropped'),
      prop('move-label', 'Move {name}'),
      prop('moved-label', '{name} moved to position {position} of {count}'),
      prop('picked-up-label', 'Picked up {name}'),
    ],
    states: [],
  },
  machines: [
    {
      bind: {
        after: { event: 'change' },
        before: { event: 'before-change' },
        behavior: { prop: 'selection-behavior' },
        chosen: { prop: 'value' },
        mode: { prop: 'selection-mode' },
      },
      machine: 'multiple-selection',
    },
    { bind: {}, machine: 'roving-focus' },
    {
      bind: {
        after: { event: 'reorder' },
        before: { event: 'before-reorder' },
        enabled: { prop: 'reorderable' },
      },
      machine: 'reorder',
    },
  ],
  name: 'list',
  rules: [
    {
      kind: 'rule',
      order: 0,
      set: [['opacity', { number: 0.9 }]],
      specificity: [0, 1, 0],
      target: 'drag-preview',
      values: [],
      webOnly: false,
      when: [],
    },
  ],
  tag: 'helix-list',
  tree: [
    { children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'list' },
    { attributes: { decorative: true, platform: 'web' }, kind: 'box', name: 'drag-preview' },
  ],
  version: '1.0',
} as unknown as Family

/* A row with a grip, bound as the expansion binds List Item. */
export const shelfRow = {
  api: {
    events: [{ cancelable: false, detail: [], name: 'action' }],
    item: { chooses: true, grip: 'grip', of: 'list' },
    props: [prop('disabled', false), prop('grip', null), prop('selected', false), prop('value')],
    states: ['dragging', 'drop-after', 'drop-before', 'selected'],
  },
  machines: [
    { bind: { disabled: { prop: 'disabled' }, part: { part: 'row' } }, machine: 'press' },
    { bind: { part: { part: 'grip' } }, machine: 'press' },
  ],
  name: 'list-item',
  rules: [],
  tag: 'helix-list-item',
  tree: [
    {
      attributes: { chooses: true, selected: { bind: 'selected' } },
      children: [
        { kind: 'region', name: 'default' },
        {
          children: [
            {
              attributes: { label: { bind: 'grip' } },
              children: [{ attributes: { decorative: true }, kind: 'box', name: 'grip-mark' }],
              kind: 'pressable',
              name: 'grip',
            },
          ],
          kind: 'when',
          name: 'grip',
        },
      ],
      kind: 'pressable',
      name: 'row',
    },
  ],
  version: '1.0',
} as unknown as Family
