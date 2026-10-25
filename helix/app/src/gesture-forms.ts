import { behaviorFor, element, type Family } from '@fusion.dev/helix-native'

/* The forms the gesture check draws, written in the shape the compiler writes,
   until a family swipes or holds: a drawer along the bottom edge that swipes
   and rests at its snap points, its rows in a part that scrolls, and a
   trigger that opens a panel on a long press while a quick press is its own. */

type Rule = Extract<NonNullable<Family['rules']>[number], { readonly kind: 'rule' }>
type When = Rule['when'][number]

/** One rule on `target`, at `order`, setting `set` while `when` holds. */
const rule = (
  order: number,
  target: string,
  set: Rule['set'],
  when: readonly When[] = [],
  inner?: string,
): Rule => ({
  kind: 'rule',
  order,
  set,
  specificity: [0, 1 + when.length, inner === undefined ? 0 : 1],
  target,
  values: [],
  webOnly: false,
  when: [...when],
  ...(inner === undefined ? {} : { inner }),
})

const OPEN = { kind: 'state', name: 'open' } as const
const SNAPPED = { kind: 'state', name: 'snapped' } as const
const token = (name: string) => ({ token: name })
const text = (words: string) => ({ text: words })

/** The events, the open prop, and the toggle each form here shares. */
const EVENTS = [
  { cancelable: true, detail: ['open'], name: 'before-close' },
  { cancelable: true, detail: ['open'], name: 'before-open' },
]
const OPEN_PROP = {
  attribute: true,
  default: false,
  name: 'open',
  tier: 'headless',
  type: 'boolean',
} as const
const TOGGLE = {
  bind: {
    checked: { prop: 'open' },
    closes: { event: 'before-close' },
    opens: { event: 'before-open' },
  },
  machine: 'toggle',
} as const

/** A panel's look: the floating surface and its edge. */
const panel = (target: string, from: number) => [
  rule(from, target, [
    ['background-color', token('color-surface-overlay')],
    ['border-radius', token('radii-md')],
    ['border-width', token('border-floating')],
    ['border-style', text('solid')],
    ['border-color', token('color-border')],
    ['color', token('color-foreground')],
    ['gap', token('space-md')],
    ['padding', token('space-lg')],
  ]),
]

const drawerForm: Family = {
  api: {
    events: EVENTS,
    props: [
      OPEN_PROP,
      { attribute: true, default: '', name: 'snap-points', tier: 'headless', type: 'string' },
    ],
    states: ['open', 'snapped'],
    toggle: { checked: 'open', closes: 'before-close', opens: 'before-open' },
  },
  machines: [
    TOGGLE,
    {
      bind: { open: { prop: 'open' }, part: { part: 'panel' }, snap: { prop: 'snap-points' } },
      machine: 'layer',
    },
  ],
  name: 'check-drawer',
  rules: [
    ...panel('panel', 0),
    rule(1, 'panel', [
      ['inline-size', text('100vw')],
      ['block-size', text('80dvh')],
      ['border-end-start-radius', text('0')],
      ['border-end-end-radius', text('0')],
    ]),
    /* A drawer resting at half shows its handle's words in the accent. */
    rule(2, 'handle', [['color', token('color-foreground-muted')]]),
    rule(3, 'handle', [['color', token('color-accent')]], [SNAPPED]),
    rule(4, 'rows', [
      ['overflow-y', text('auto')],
      ['flex-grow', { number: 1 }],
      ['flex-basis', text('0')],
      ['gap', token('space-sm')],
    ]),
    rule(
      5,
      'panel',
      [
        ['background-color', token('color-overlay')],
        ['opacity', { number: 0 }],
        [
          'transition',
          { space: [text('opacity'), token('duration-normal'), token('easing-standard')] },
        ],
      ],
      [],
      '::backdrop',
    ),
    rule(6, 'panel', [['opacity', { number: 1 }]], [OPEN], '::backdrop'),
  ],
  tag: 'helix-check-drawer',
  tree: [
    {
      attributes: {
        closedby: 'any',
        edge: 'bottom',
        label: 'Filters',
        modal: true,
        open: { bind: 'open' },
        role: 'dialog',
        snap: { bind: 'snap-points' },
        swipe: true,
      },
      children: [
        { children: [{ kind: 'region', name: 'handle' }], kind: 'box', name: 'handle' },
        { children: [{ kind: 'region', name: 'default' }], kind: 'box', name: 'rows' },
      ],
      kind: 'layer',
      name: 'panel',
    },
  ],
  version: '1.1',
}

const dialForm: Family = {
  api: {
    events: [...EVENTS, { cancelable: false, detail: [], name: 'press' }],
    props: [OPEN_PROP],
    states: [
      'open',
      'placed-bottom',
      'placed-left',
      'placed-right',
      'placed-top',
      'aligned-end',
      'aligned-start',
    ],
    toggle: { checked: 'open', closes: 'before-close', opens: 'before-open' },
  },
  machines: [
    { bind: { part: { part: 'trigger' }, sends: { event: 'press' } }, machine: 'press' },
    TOGGLE,
    {
      bind: { anchor: { part: 'trigger' }, open: { prop: 'open' }, part: { part: 'actions' } },
      machine: 'layer',
    },
  ],
  name: 'check-dial',
  rules: [
    rule(0, 'trigger', [
      ['background-color', token('color-accent')],
      ['border-radius', token('radii-full')],
      ['color', token('color-accent-contrast')],
      ['padding', token('space-md')],
    ]),
    ...panel('actions', 1),
  ],
  tag: 'helix-check-dial',
  tree: [
    {
      attributes: { held: true, label: 'Add', role: 'button' },
      children: [{ kind: 'region', name: 'label' }],
      kind: 'pressable',
      name: 'trigger',
    },
    {
      attributes: {
        anchor: 'trigger',
        label: 'Add',
        offset: 8,
        open: { bind: 'open' },
        placement: 'top-start',
        role: 'dialog',
      },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'actions',
    },
  ],
  version: '1.1',
}

export const CheckDrawer = element(drawerForm, behaviorFor(drawerForm))
export const CheckDial = element(dialForm, behaviorFor(dialForm))
