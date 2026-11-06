import type { ToggleContext } from './machine.js'

/*
 * The toggle machine's test vectors: presses from a starting context, each
 * accepted or refused, and what each leaves. Each restates a web spec, named
 * in `cites`. The machine's spec holds the compiled module and the web's
 * `toggled` to them, and the native host's spec holds a phone's component to
 * them, so every platform answers one list.
 */

/** One press and what it leaves. */
export interface VectorStep {
  /** The requests the press asks, by name, in order. None where the control takes no press. */
  readonly asks: readonly string[]

  /** Whether the control is checked after the press. */
  readonly checked: boolean

  /** The effects the press runs, by name, in order. */
  readonly effects: readonly string[]

  /** Whether the control is mixed after the press. */
  readonly mixed: boolean

  /** Whether a listener refuses the request the press asks. */
  readonly refuse?: boolean

  /** The state the press leaves the machine in. */
  readonly state: 'mixed' | 'off' | 'on'
}

/** Presses from a starting context. */
export interface Vector {
  /** The web element and the spec case the vector restates, or why none covers it. */
  readonly cites: string

  /** The context the presses start from. */
  readonly from: ToggleContext

  /** What the vector covers. */
  readonly name: string

  /** Each press, in order. */
  readonly steps: readonly VectorStep[]
}

const AT_REST: ToggleContext = { checked: false, disabled: false, mixed: false, readOnly: false }

/** Asked and taken: the request, then the announcement and the form's new value. */
const TAKEN = { asks: ['toggle'], effects: ['announce', 'report'] } as const

/** Asked and refused: the request, and nothing after it. */
const REFUSED = { asks: ['toggle'], effects: [], refuse: true } as const

/** Not asked at all. */
const IGNORED = { asks: [], effects: [] } as const

/** Every vector, in the order the machine's spec reads them. */
export const VECTORS: readonly Vector[] = [
  {
    cites:
      'switch-root.dom.spec.ts, "`click()` on the element toggles it, once, as it does a native checkbox"',
    from: AT_REST,
    name: 'a press turns the control on, and the next turns it off',
    steps: [
      { ...TAKEN, checked: true, mixed: false, state: 'on' },
      { ...TAKEN, checked: false, mixed: false, state: 'off' },
    ],
  },
  {
    cites:
      'checkbox-root.dom.spec.ts, "a box whose markup declared `checked` still moves, the property being a seed"',
    from: { ...AT_REST, checked: true },
    name: 'a press on a control that starts checked unchecks it',
    steps: [{ ...TAKEN, checked: false, mixed: false, state: 'off' }],
  },
  {
    cites:
      'checkbox-root.dom.spec.ts, "changing announces before it acts, and a refusal holds the state", and "a refused toggle sends no change"',
    from: AT_REST,
    name: 'a refused press leaves the control as it was and says nothing',
    steps: [
      { ...REFUSED, checked: false, mixed: false, state: 'off' },
      { ...TAKEN, checked: true, mixed: false, state: 'on' },
    ],
  },
  {
    cites:
      'toggle-root.dom.spec.ts, "is a toggle button that a press flips, saying so with aria-pressed", where `helix-before-check` is refused once pressed',
    from: AT_REST,
    name: 'a refusal holds a pressed toggle pressed',
    steps: [
      { ...TAKEN, checked: true, mixed: false, state: 'on' },
      { ...REFUSED, checked: true, mixed: false, state: 'on' },
    ],
  },
  {
    cites: 'checkbox-root.dom.spec.ts, "the first change resolves indeterminate"',
    from: { ...AT_REST, mixed: true },
    name: 'a press resolves a mixed control that is unchecked underneath to checked',
    steps: [{ ...TAKEN, checked: true, mixed: false, state: 'on' }],
  },
  {
    cites:
      'No dom spec: a native checkbox flips `checked` under `indeterminate`, and checkbox-root.ts reads what it flipped to',
    from: { ...AT_REST, checked: true, mixed: true },
    name: 'a press resolves a mixed control that is checked underneath to unchecked',
    steps: [{ ...TAKEN, checked: false, mixed: false, state: 'off' }],
  },
  {
    cites: 'checkbox-mixed.dom.spec.ts, "leaves the inner input mixed, as the element still is"',
    from: { ...AT_REST, mixed: true },
    name: 'a refused press keeps the dash',
    steps: [{ ...REFUSED, checked: false, mixed: true, state: 'mixed' }],
  },
  {
    cites:
      'toggle-root.dom.spec.ts, "refuses from the platform and from the method the group calls"',
    from: { ...AT_REST, disabled: true },
    name: 'a disabled control takes no press and asks nothing',
    steps: [{ ...IGNORED, checked: false, mixed: false, state: 'off' }],
  },
  {
    cites:
      'checkbox-root.dom.spec.ts and switch-root.dom.spec.ts, "refuses a press on the control and on the host, and still submits"',
    from: { ...AT_REST, checked: true, readOnly: true },
    name: 'a read-only control takes no press and asks nothing',
    steps: [{ ...IGNORED, checked: true, mixed: false, state: 'on' }],
  },
  {
    cites:
      'No dom spec: a disabled checkbox renders a disabled input, which the platform gives no click',
    from: { ...AT_REST, disabled: true, mixed: true },
    name: 'a disabled mixed control keeps the dash',
    steps: [{ ...IGNORED, checked: false, mixed: true, state: 'mixed' }],
  },
]
