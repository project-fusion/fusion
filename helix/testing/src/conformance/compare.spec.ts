import { describe, expect, test } from 'bun:test'
import { compareWritten, keepDeclared } from './compare.js'
import { el, type Known, keyOf, type Scenario, type Step, type Written } from './format.js'

const SCENARIO: Scenario = {
  family: 'tabs',
  intents: [
    { item: 'b', kind: 'press' },
    { key: 'End', kind: 'key' },
  ],
  name: 'a press chooses a tab',
  setup: el('helix-tabs', {}, [
    el('helix-tab', { value: 'a' }, ['A']),
    el('helix-tab', { value: 'b' }, ['B']),
  ]),
}
const KEY = keyOf(SCENARIO)

const LEFT = { chosen: ['b'], focused: 'b', opened: [], shown: [] }

/** The two steps of the scenario, with what the press sent. */
const steps = (detail: Record<string, unknown>, extra = false): Step[] => [
  {
    events: [
      { canceled: false, detail, from: 'b', name: 'before-select' },
      ...(extra ? [{ canceled: false, detail: {}, from: null, name: 'change' }] : []),
    ],
    intent: 'press b',
    left: LEFT,
  },
  { events: [], intent: 'key End', left: LEFT },
]

const DECLARED = { 'helix-tab': [{ detail: ['value'], name: 'before-select' }], 'helix-tabs': [] }

const web = (
  platform: 'chromium' | 'webkit',
  record = steps({ source: 'pointer', value: 'b' }, true),
): Written => ({
  platform,
  record: { [KEY]: record },
})

const native = (record: Step[], known: Known[] = []): Written => ({
  declared: DECLARED,
  known,
  platform: 'react-native',
  record: { [KEY]: record },
})

const ALL = ['chromium', 'webkit', 'react-native'] as const

describe('compareWritten', () => {
  test('keeps only what the form declares of either record', () => {
    const kept = keepDeclared(DECLARED)(
      {
        canceled: false,
        detail: { source: 'pointer', value: 'b' },
        from: 'b',
        name: 'before-select',
      },
      SCENARIO,
    )
    expect(kept?.detail).toEqual({ value: 'b' })
    expect(
      keepDeclared(DECLARED)({ canceled: false, detail: {}, from: null, name: 'change' }, SCENARIO),
    ).toBeUndefined()
  })

  test('keeps an event from a child with no value, from the child whose form declares it', () => {
    const page: Scenario = {
      family: 'outline',
      intents: [],
      name: 'an outline beside its sections',
      setup: el('helix-scroll-area', {}, [
        el('helix-outline-section', { anchor: 'a' }, ['A']),
        el('helix-outline', {}),
      ]),
    }
    const declared = {
      'helix-outline': [{ detail: ['value'], name: 'activate' }],
      'helix-outline-section': [],
      'helix-scroll-area': [],
    }
    const kept = keepDeclared(declared)(
      { canceled: false, detail: { value: 'a' }, from: '', name: 'activate' },
      page,
    )
    expect(kept?.detail).toEqual({ value: 'a' })
  })

  test('passes when the browsers agree and React Native matches what the form declares', () => {
    const verdict = compareWritten(
      [SCENARIO],
      [web('chromium'), web('webkit'), native(steps({ value: 'b' }))],
      ALL,
    )
    expect(verdict.failures).toEqual([])
  })

  test('holds WebKit to Chromium exactly', () => {
    const verdict = compareWritten(
      [SCENARIO],
      [
        web('chromium'),
        web('webkit', steps({ source: 'keyboard', value: 'b' }, true)),
        native(steps({ value: 'b' })),
      ],
      ALL,
    )
    expect(verdict.failures).toHaveLength(1)
    expect(verdict.failures[0]).toContain('WebKit parts from Chromium')
    expect(verdict.failures[0]).toContain('1. press b')
  })

  test('names the scenario, the intent, and both records where React Native differs', () => {
    const verdict = compareWritten(
      [SCENARIO],
      [web('chromium'), native(steps({ value: 'a' }))],
      ['chromium', 'react-native'],
    )
    expect(verdict.failures).toHaveLength(1)
    const [failure] = verdict.failures
    expect(failure).toContain(KEY)
    expect(failure).toContain('1. press b')
    expect(failure).toContain('Chromium: before-select from b {"value":"b"}')
    expect(failure).toContain('React Native: before-select from b {"value":"a"}')
  })

  test('reports a known difference, and fails on one that no longer differs', () => {
    const known = { cause: 'Waits on a decision.', intent: 1, scenario: KEY }
    const differs = compareWritten(
      [SCENARIO],
      [web('chromium'), native(steps({ value: 'a' }), [known])],
      ['chromium', 'react-native'],
    )
    expect(differs.failures).toEqual([])
    expect(differs.notes.join('\n')).toContain('Waits on a decision.')
    const stale = compareWritten(
      [SCENARIO],
      [web('chromium'), native(steps({ value: 'b' }), [known])],
      ['chromium', 'react-native'],
    )
    expect(stale.failures).toEqual([
      `These no longer differ. Take them out of helix/native/tests/conformance/known.ts:\n  ${KEY}, intent 1`,
    ])
  })

  test('fails on a record that was not written, or lacks a scenario, or holds one twice', () => {
    const missing = compareWritten([SCENARIO], [web('chromium')], ALL)
    expect(missing.failures).toEqual([
      'No WebKit record was written.',
      'No React Native record was written.',
    ])
    const lacking = compareWritten(
      [SCENARIO],
      [web('chromium'), { platform: 'webkit', record: {} }],
      ['chromium', 'webkit'],
    )
    expect(lacking.failures).toEqual([`The WebKit record holds none of these scenarios:\n  ${KEY}`])
    const twice = compareWritten([SCENARIO], [web('chromium'), web('chromium')], ['chromium'])
    expect(twice.failures).toEqual([`Chromium recorded \`${KEY}\` twice.`])
  })
})
