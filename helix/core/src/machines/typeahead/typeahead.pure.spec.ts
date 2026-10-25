import { describe, expect, test } from 'bun:test'
import { Typeahead } from '../../utils/typeahead/typeahead.js'
import { type Compiled, conforms, coverage, effectNames } from '../conformance.js'
import type { Moved } from '../reference.js'
import {
  type TypeaheadContext,
  type TypeaheadInput,
  type TypeaheadItem,
  typeahead,
} from './machine.js'
import * as generated from './typeahead.generated.js'

/*
 * The compiled module held to the machine, one move at a time, and the web's
 * `Typeahead` held to the machine. `typeahead-presses.pure.spec.ts` makes
 * whole searches, press after press, and the two are one spec split at the
 * 400 lines a file may have.
 */

const typed: Compiled<TypeaheadContext, TypeaheadInput> = generated

/** Items with these words, valued `item-0`, `item-1`, and on, named as in the controller's spec. */
const named = (...words: string[]): TypeaheadItem[] =>
  words.map((text, index) => ({ value: `item-${index}`, words: text }))

/* Every context and input the machine tells apart: no search under way, one
   letter, and a word, with an item moved to and with none; no items, items
   that share a first letter, and items that do not; a character that
   matches, one that continues a word, a Space, and one that matches nothing;
   each place a search starts from; and every flag. */
const contexts: TypeaheadContext[] = [
  { at: '', letters: '' },
  { at: '', letters: 'c' },
  { at: 'item-0', letters: 'c' },
  { at: '', letters: 'ca' },
]
const inputs: TypeaheadInput[] = []
for (const items of [[], named('Cambodia', 'Canada', 'Chile'), named('Apple', 'Banana')]) {
  for (const character of ['c', 'a', ' ', 'z']) {
    for (const from of ['', 'item-0', 'item-1']) {
      for (const focus of [false, true]) {
        for (const selects of [false, true]) {
          inputs.push({ character, focus, from, items, selects })
        }
      }
    }
  }
}

describe('the compiled typeahead module', () => {
  test('starts, answers every event, and ends its deadline as the machine does', () => {
    expect(conforms(typeahead, typed, contexts, inputs)).toEqual([])
  })

  test('is held to the machine in every state and on both answers of every guard', () => {
    expect([...coverage(typeahead, contexts, inputs)].sort()).toEqual([
      'chooses false',
      'chooses true',
      'idle',
      'moves false',
      'moves true',
      'searching',
      'takes false',
      'takes true',
    ])
  })
})

/* keyboard-navigation-controller.ts, `arrive`: focuses the item, then chooses
   it where arriving chooses. The earlier format had `chosen` and `focused`
   only so that entering them ran `focus` and `select`. The effects now ride
   the move that arrives, between the end of one pause and the start of the
   next. */
describe('an arrival, written as effects on the move', () => {
  const items = named('Cambodia', 'Canada', 'Chile')

  /** The item a character moves to from Cambodia, and the effects of the move, by name. */
  const typing = (context: TypeaheadContext, character: string, selects: boolean) => {
    const input = { character, focus: false, from: 'item-0', items, selects }
    const state = typed.start(context)
    const move = typed.step(state, context, generated.EVENT_TYPE, input) as Moved<TypeaheadContext>
    return { at: move.context.at, effects: effectNames(typed, move.effects) }
  }

  test('focuses, then chooses, on the move that arrives, and does neither where it arrives nowhere', () => {
    const one = { at: 'item-0', letters: 'c' }
    expect(typed.STATES).toEqual(['idle', 'searching'])
    expect(typing({ at: '', letters: '' }, 'c', true)).toEqual({
      at: 'item-1',
      effects: ['focus', 'select', 'deadline'],
    })
    expect(typing(one, 'c', true)).toEqual({
      at: 'item-1',
      effects: ['deadline-end', 'focus', 'select', 'deadline'],
    })
    expect(typing(one, 'c', false)).toEqual({
      at: 'item-1',
      effects: ['deadline-end', 'focus', 'deadline'],
    })
    expect(typing(one, 'a', true)).toEqual({ at: '', effects: ['deadline-end', 'deadline'] })
  })
})

/* The letters a search holds, a character typed after them, a set, and the
   index of the item the search starts from. A Space with no search under way
   is left out: the controller leaves it alone, and `Typeahead.match` never
   sees it. */
const cases: [string, string, TypeaheadItem[], number][] = []
for (const letters of ['', 'c', 'cc', 'ca', 'cam', 'n', 'new', 'new ']) {
  for (const character of ['c', 'C', 'a', 'n', 'y', ' ', 'z']) {
    if (letters === '' && character === ' ') {
      continue
    }
    for (const items of [
      named('Cambodia', 'Canada', 'Chile'),
      named('New Haven', 'New York', 'Norway'),
      named('  canada ', 'CHILE', 'Cuba'),
    ]) {
      for (let from = -1; from < items.length; from += 1) {
        cases.push([letters, character, items, from])
      }
    }
  }
}

/* **The web runs `Typeahead`, written by hand, and this holds its search to
   the machine.** Each case types a character after the letters a search holds,
   from each item and from none. The controller moves only where the search
   lands on an item other than the one it starts from, and `at` names an item
   only there. */
describe('Typeahead, which the web runs', () => {
  test('lands where the machine lands, from every item and from none', () => {
    for (const [letters, character, items, from] of cases) {
      const texts = items.map((item) => item.words)
      const search = new Typeahead()
      for (const letter of letters) {
        search.match(letter, texts, -1, 0)
      }
      const at = search.match(character, texts, from, 0)
      const want = at >= 0 && at !== from ? items[at]?.value : ''
      const context = { at: '', letters }
      const move = typed.step(typed.start(context), context, generated.EVENT_TYPE, {
        character,
        focus: false,
        from: items[from]?.value ?? '',
        items,
        selects: true,
      }) as Moved<TypeaheadContext> | undefined
      expect({ character, from, letters, to: move?.context.at }).toEqual({
        character,
        from,
        letters,
        to: want,
      })
    }
  })
})
