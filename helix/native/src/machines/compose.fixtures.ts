/*
 * The pilot's families in miniature, bound as the expansion binds them, for
 * the specs of the native composer. Neutral builds no forms before its specs
 * run, so these are written by hand to the shape `helix family build` writes.
 */
import type { Family } from '../style/form'

/** A string prop, as the form writes one. */
const prop = (name: string, value: unknown = '') => ({
  attribute: true,
  default: value,
  name,
  tier: 'headless',
  type: typeof value === 'boolean' ? 'boolean' : 'string',
})

/** A prop with no default, as List's `selection-mode`, which a reader-only list leaves unset. */
const unset = (name: string) => ({ attribute: true, name, tier: 'headless', type: 'string' })

/* A tab set in miniature, bound as the expansion binds Tabs. */
export const tabs = {
  api: {
    collection: { chosen: 'active', keys: { chooses: true, wrap: true }, manual: 'manual' },
    events: [
      { cancelable: false, detail: ['previous', 'value'], name: 'activate' },
      { cancelable: true, detail: ['value'], name: 'before-activate' },
      { cancelable: true, detail: ['value'], name: 'before-select' },
    ],
    props: [prop('active'), prop('default-active'), prop('manual', false)],
    states: [],
  },
  machines: [
    {
      bind: {
        after: { event: 'activate' },
        before: { event: 'before-activate' },
        chosen: { prop: 'active' },
        seed: { prop: 'default-active' },
      },
      machine: 'single-selection',
    },
    { bind: { manual: { prop: 'manual' } }, machine: 'roving-focus' },
    { bind: {}, machine: 'typeahead' },
  ],
  name: 'tabs',
  rules: [],
  tag: 'helix-tabs',
  tree: [
    {
      attributes: { role: 'tablist' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'tabs',
    },
  ],
  version: '1.0',
} as unknown as Family

/* A tab in miniature, bound as the expansion binds Tab. */
export const tab = {
  api: {
    events: [{ cancelable: true, detail: ['value'], name: 'before-select' }],
    item: { chooses: true, of: 'tabs' },
    props: [prop('disabled', false), prop('href'), prop('selected', false), prop('value')],
    states: [],
  },
  machines: [
    {
      bind: {
        disabled: { prop: 'disabled' },
        part: { part: 'tab' },
        sends: { event: 'before-select' },
      },
      machine: 'press',
    },
  ],
  name: 'tabs-tab',
  rules: [],
  tag: 'helix-tab',
  tree: [
    {
      attributes: {
        chooses: true,
        disabled: { bind: 'disabled' },
        role: 'tab',
        selected: { bind: 'selected' },
        sends: 'before-select',
      },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'tab',
    },
  ],
  version: '1.0',
} as unknown as Family

/* A list in miniature, bound as the expansion binds List. */
export const list = {
  api: {
    collection: {
      chosen: 'value',
      keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: false },
      mode: 'selection-mode',
    },
    events: [
      { cancelable: false, detail: [], name: 'action' },
      { cancelable: true, detail: ['value'], name: 'before-change' },
      { bare: true, cancelable: false, detail: [], name: 'change' },
    ],
    props: [
      prop('disabled-behavior', 'all'),
      prop('selection-behavior', 'toggle'),
      unset('selection-mode'),
      prop('value'),
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
    { bind: {}, machine: 'typeahead' },
  ],
  name: 'list',
  rules: [],
  tag: 'helix-list',
  tree: [{ children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'list' }],
  version: '1.0',
} as unknown as Family

/* A row in miniature, bound as the expansion binds List Item. */
export const row = {
  api: {
    events: [{ cancelable: false, detail: [], name: 'action' }],
    item: { chooses: true, of: 'list' },
    props: [prop('disabled', false), prop('selected', false), prop('value')],
    states: [],
  },
  machines: [{ bind: { disabled: { prop: 'disabled' }, part: { part: 'row' } }, machine: 'press' }],
  name: 'list-item',
  rules: [],
  tag: 'helix-list-item',
  tree: [
    {
      attributes: { chooses: true, disabled: { bind: 'disabled' }, selected: { bind: 'selected' } },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'row',
    },
  ],
  version: '1.0',
} as unknown as Family

/* A button in miniature, bound as the expansion binds Button. */
export const button = {
  api: {
    events: [{ cancelable: false, detail: ['pointerType'], name: 'press' }],
    props: [prop('disabled', false)],
    states: [],
  },
  machines: [
    {
      bind: { disabled: { prop: 'disabled' }, part: { part: 'button' }, sends: { event: 'press' } },
      machine: 'press',
    },
  ],
  name: 'button',
  rules: [],
  tag: 'helix-button',
  tree: [
    {
      attributes: { role: 'button' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'pressable',
      name: 'button',
    },
  ],
  version: '1.0',
} as unknown as Family
