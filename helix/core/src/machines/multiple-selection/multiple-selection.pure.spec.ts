import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import type { Asked, Moved } from '../reference.js'
import {
  type ChoiceContext,
  type ChoiceInput,
  type ChoiceItem,
  multipleSelection,
} from './machine.js'
import * as choiceModule from './multiple-selection.generated.js'

/*
 * The compiled module held to the machine, and one move at a time.
 * `multiple-selection-list.pure.spec.ts` runs presses and keys event after
 * event, and the two are one spec split at the 400 lines a file may have.
 */

const choice: Compiled<ChoiceContext, ChoiceInput> = choiceModule

/** Items by value, where a value ending in `!` is a disabled item. */
const itemsOf = (...values: string[]): ChoiceItem[] =>
  values.map((value) => ({ disabled: value.endsWith('!'), value: value.replace('!', '') }))

/* Every context and input the machine tells apart: each mode, behavior, and
   disabled behavior; nothing chosen, one item, and two; no anchor and one;
   no item a range reached and one; and Shift, Control, an item focus left,
   and a disabled item among three. */
const contexts: ChoiceContext[] = []
for (const mode of ['none', 'single', 'multiple'] as const) {
  for (const behavior of ['toggle', 'replace'] as const) {
    for (const disabledBehavior of ['all', 'selection'] as const) {
      for (const value of ['', 'a', 'a,c']) {
        for (const anchor of [undefined, 'c']) {
          for (const reached of [undefined, 'a']) {
            contexts.push({ anchor, behavior, disabledBehavior, mode, reached, value })
          }
        }
      }
    }
  }
}
const items = itemsOf('a', 'b!', 'c')
const inputs: ChoiceInput[] = []
for (const item of items) {
  for (const extend of [false, true]) {
    for (const toggle of [false, true]) {
      for (const from of [undefined, 'a']) {
        inputs.push({ extend, from, item, items, toggle })
      }
    }
  }
}

describe('the compiled multiple-selection module', () => {
  test('numbers the events in the order the machine writes them, with none for the anchor', () => {
    expect([
      choiceModule.EVENT_PRESS,
      choiceModule.EVENT_SPACE,
      choiceModule.EVENT_ARRIVE,
      choiceModule.EVENT_ALL,
      choiceModule.EVENT_CLEAR,
      choiceModule.EVENT_ENTER,
    ]).toEqual(multipleSelection.events.map((_, index) => index))
    expect(choice.EVENTS).toEqual(['PRESS', 'SPACE', 'ARRIVE', 'ALL', 'CLEAR', 'ENTER'])
  })

  test('compiles as the reference reads the machine', () => {
    expect(conforms(multipleSelection, choice, contexts, inputs)).toEqual([])
  })

  test('is held over contexts and inputs that reach every state and both answers of every guard', () => {
    const guards = [
      'acts',
      'arrivalChanges',
      'clearable',
      'enterActs',
      'everyChanges',
      'extending',
      'movesAnchor',
      'pressChanges',
      'startsRange',
    ]
    const want = [
      'choosing',
      'none',
      ...guards.flatMap((name) => [`${name} false`, `${name} true`]),
    ]
    expect([...coverage(multipleSelection, contexts, inputs)].sort()).toEqual(want.sort())
  })
})

describe('effects carried by the moves that run them', () => {
  const choosing = stateOf(choice, 'choosing')
  const none = stateOf(choice, 'none')
  const context: ChoiceContext = {
    anchor: undefined,
    behavior: 'toggle',
    disabledBehavior: 'all',
    mode: 'multiple',
    reached: undefined,
    value: '',
  }
  const input: ChoiceInput = {
    extend: false,
    from: undefined,
    item: { disabled: false, value: 'a' },
    items,
    toggle: false,
  }

  /* list-root.ts, `choose`: `requestValue` sends `change` once the value has
     moved, and nothing where a listener refused it. */
  test('an accepted change sends `change`, a refused one sends nothing, and the set stays choosing', () => {
    const asked = choice.step(
      choosing,
      context,
      choiceModule.EVENT_PRESS,
      input,
    ) as Asked<ChoiceContext>
    expect({
      accept: effectNames(choice, asked.accept.effects),
      ask: asked.ask.map((code) => choice.ASKS[code]),
      refuse: effectNames(choice, asked.refuse.effects),
      states: [asked.accept.state, asked.refuse.state],
    }).toEqual({ accept: ['announce'], ask: ['change'], refuse: [], states: [choosing, choosing] })
  })

  /* list-root.ts, `act` and `handleClick`: Enter acts on the row, and so does
     a press in a list that selects nothing. */
  test('acting on the item runs `act`, and the set stays where it was', () => {
    const entered = choice.step(
      choosing,
      context,
      choiceModule.EVENT_ENTER,
      input,
    ) as Moved<ChoiceContext>
    const pressed = choice.step(
      none,
      { ...context, mode: 'none' },
      choiceModule.EVENT_PRESS,
      input,
    ) as Moved<ChoiceContext>
    expect([
      effectNames(choice, entered.effects),
      entered.state,
      effectNames(choice, pressed.effects),
      pressed.state,
    ]).toEqual([['act'], choosing, ['act'], none])
  })

  test('has a state for a set that chooses and one for a set that chooses nothing, and no others', () => {
    expect(choice.STATES).toEqual(['choosing', 'none'])
    expect([choice.entering(choosing), choice.entering(none)]).toEqual([[], []])
  })
})
