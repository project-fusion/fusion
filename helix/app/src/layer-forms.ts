import { behaviorFor, element, type Family } from '@fusion.dev/helix-native'

/* The forms the layer check draws, written in the shape the compiler writes,
   as the native specs write theirs, until a family opens a layer: a modal
   dialog that is a card in a wide window and a sheet below 30rem, and a
   menu placed against its trigger with an arrow, a sheet or a popover as its
   `presentation` says. */

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
const SHEET = { kind: 'state', name: 'sheet' } as const
const NARROW = { below: '30rem', kind: 'window' } as const
const token = (name: string) => ({ token: name })
const text = (words: string) => ({ text: words })
const less = (first: string, second: string) => ({
  calc: { op: '-' as const, operands: [text(first), token(second)] },
})
/* A sheet's last row, kept clear of the home indicator: `safeArea('bottom')`. */
const clear = {
  calc: {
    op: '+' as const,
    operands: [
      token('space-lg'),
      { function: { arguments: [text('safe-area-inset-bottom'), text('0px')], name: 'env' } },
    ],
  },
}

/** What every layer here shares: its events, its props and states, and its toggle. */
const api = (
  states: readonly string[],
  props: NonNullable<Family['api']>['props'] = [],
): NonNullable<Family['api']> => ({
  events: [
    { cancelable: true, detail: ['open'], name: 'before-close' },
    { cancelable: true, detail: ['open'], name: 'before-open' },
  ],
  props: [
    {
      attribute: true,
      name: 'closedby',
      tier: 'headless',
      type: ['any', 'closerequest', 'none'],
    },
    { attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' },
    ...(props ?? []),
  ],
  states: ['open', ...states],
  toggle: { checked: 'open', closes: 'before-close', opens: 'before-open' },
})

const TOGGLE = {
  bind: {
    checked: { prop: 'open' },
    closes: { event: 'before-close' },
    opens: { event: 'before-open' },
  },
  machine: 'toggle',
} as const

/** A panel's look: the floating surface, its edge, and its fade. */
const panel = (target: string, from: number) => [
  rule(from, target, [
    ['background-color', token('color-surface-overlay')],
    ['border-radius', token('radii-sm')],
    ['border-width', token('border-floating')],
    ['border-style', text('solid')],
    ['border-color', token('color-border')],
    ['color', token('color-foreground')],
    ['gap', token('space-md')],
    ['padding', token('space-lg')],
    ['opacity', { number: 0 }],
    [
      'transition',
      {
        list: [
          { space: [text('opacity'), token('duration-normal'), token('easing-standard')] },
          { space: [text('translate'), token('duration-normal'), token('easing-decelerate')] },
        ],
      },
    ],
  ]),
  rule(from + 1, target, [['opacity', { number: 1 }]], [OPEN]),
]

/** The scrim behind a layer, which fades in as it opens while `when` holds. */
const scrim = (from: number, when: readonly When[] = []) => [
  rule(
    from,
    'surface',
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
  rule(from + 1, 'surface', [['opacity', { number: 1 }]], [...when, OPEN], '::backdrop'),
]

/** Square where a sheet meets the window, and its last row clear of the home indicator. */
const sheetLook = (from: number, when: When) => [
  rule(
    from,
    'surface',
    [
      ['margin-block-start', text('auto')],
      ['inline-size', text('100vw')],
      ['max-block-size', less('100dvh', 'space-3xl')],
      ['border-end-start-radius', text('0')],
      ['border-end-end-radius', text('0')],
      ['padding-block-end', clear],
      ['translate', { space: [text('0'), text('100%')] }],
    ],
    [when],
  ),
  rule(from + 1, 'surface', [['translate', { space: [text('0'), text('0')] }]], [when, OPEN]),
]

const dialogForm: Family = {
  api: api([]),
  machines: [
    TOGGLE,
    {
      bind: { closedby: { prop: 'closedby' }, open: { prop: 'open' }, part: { part: 'surface' } },
      machine: 'layer',
    },
  ],
  name: 'check-dialog',
  rules: [
    ...panel('surface', 0),
    rule(2, 'surface', [
      [
        'inline-size',
        { function: { arguments: [text('28rem'), less('100vw', 'space-xl')], name: 'min' } },
      ],
      ['max-block-size', less('100dvh', 'space-xl')],
      ['translate', { space: [text('0'), token('space-lg')] }],
    ]),
    rule(3, 'surface', [['translate', { space: [text('0'), text('0')] }]], [OPEN]),
    ...sheetLook(4, NARROW),
    ...scrim(6),
  ],
  tag: 'helix-check-dialog',
  tree: [
    {
      attributes: {
        closedby: { bind: 'closedby' },
        label: 'Rename the file',
        modal: true,
        open: { bind: 'open' },
        role: 'dialog',
      },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
}

/** The states of a layer placed against its anchor, as the web's floating controller writes them. */
const PLACED = [
  'sheet',
  'placed-bottom',
  'placed-left',
  'placed-right',
  'placed-top',
  'aligned-end',
  'aligned-start',
]

const menuForm: Family = {
  api: api(PLACED, [
    {
      attribute: true,
      default: 'auto',
      name: 'presentation',
      tier: 'headless',
      type: ['auto', 'popover', 'sheet'],
    },
  ]),
  machines: [
    TOGGLE,
    {
      bind: {
        anchor: { part: 'trigger' },
        arrow: { part: 'arrow' },
        open: { prop: 'open' },
        part: { part: 'surface' },
        presentation: { prop: 'presentation' },
      },
      machine: 'layer',
    },
  ],
  name: 'check-menu',
  rules: [
    ...panel('surface', 0),
    rule(2, 'surface', [
      ['max-block-size', { measured: { name: 'floating-available-block-size' } }],
      ['inline-size', text('16rem')],
    ]),
    ...sheetLook(3, SHEET),
    ...scrim(5, [SHEET]),
    /* The arrow: a square turned on its center, the panel's own fill. */
    rule(7, 'arrow', [
      ['background-color', token('color-surface-overlay')],
      ['block-size', text('10px')],
      ['inline-size', text('10px')],
      ['position', text('absolute')],
      ['rotate', text('45deg')],
    ]),
    rule(8, 'arrow', [['display', text('none')]], [SHEET]),
  ],
  tag: 'helix-check-menu',
  tree: [
    { attributes: { part: 'trigger' }, kind: 'region', name: 'trigger' },
    {
      attributes: {
        anchor: 'trigger',
        arrow: 'arrow',
        label: 'Sort',
        offset: 4,
        open: { bind: 'open' },
        presentation: { bind: 'presentation' },
        role: 'dialog',
      },
      children: [
        { kind: 'box', name: 'arrow' },
        { kind: 'region', name: 'default' },
      ],
      kind: 'layer',
      name: 'surface',
    },
  ],
  version: '2.0',
}

export const CheckDialog = element(dialogForm, behaviorFor(dialogForm))
export const CheckMenu = element(menuForm, behaviorFor(menuForm))
