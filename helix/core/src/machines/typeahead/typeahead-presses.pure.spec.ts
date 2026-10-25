import { describe, expect, test } from 'bun:test'
import { Typeahead } from '../../utils/typeahead/typeahead.js'
import { type Compiled, effectNames, stateOf } from '../conformance.js'
import type { Moved } from '../reference.js'
import type { TypeaheadContext, TypeaheadInput, TypeaheadItem } from './machine.js'
import * as generated from './typeahead.generated.js'

/*
 * Whole searches, press after press, as the web's specs make them, through a
 * host that keeps time for the deadline. `typeahead.pure.spec.ts` holds the
 * compiled module to the machine one move at a time, and the two are one
 * spec split at the 400 lines a file may have.
 */

const typed: Compiled<TypeaheadContext, TypeaheadInput> = generated

/** Items with these words, valued `item-0`, `item-1`, and on, named as in the controller's spec. */
const named = (...words: string[]): TypeaheadItem[] =>
  words.map((text, index) => ({ value: `item-${index}`, words: text }))

const idle = stateOf(typed, 'idle')
const searching = stateOf(typed, 'searching')

/** The number the deadline of `searching` names its owner by. */
const owner = typed.NODES.indexOf('searching')

/**
 * A host that holds the state and the context, sends each event, performs
 * what each move asks for, and keeps a clock for the deadline, as the timers
 * capability does. `asked` records focus and choice as the controller's spec
 * records them, and `ran` the effects of each move by name. A press starts
 * from the item focus is on unless another is named.
 */
const host = (items: TypeaheadItem[], options: Partial<TypeaheadInput> = {}) => {
  let context: TypeaheadContext = { at: '', letters: '' }
  let state = typed.start(context)
  let now = 0
  let focused = ''
  const ends = new Map<number, number>()
  const asked: string[] = []
  const ran: string[][] = []
  const perform = (move: Moved<TypeaheadContext>): void => {
    state = move.state
    context = move.context
    const names = effectNames(typed, move.effects)
    ran.push(names)
    names.forEach((name, index) => {
      const argument = move.effects[index]?.[1]
      if (name === 'deadline') {
        ends.set(Number(argument?.owner), now + Number(argument?.ms))
      } else if (name === 'deadline-end') {
        ends.delete(Number(argument?.owner))
      } else {
        focused = name === 'focus' ? context.at : focused
        asked.push(`${name} ${context.at}`)
      }
    })
  }
  const send = (event: number, input: Partial<TypeaheadInput>): boolean => {
    const move = typed.step(state, context, event, {
      character: '',
      focus: false,
      from: '',
      items,
      selects: true,
      ...options,
      ...input,
    })
    if (move !== undefined) {
      perform(move as Moved<TypeaheadContext>)
    }
    return move !== undefined
  }
  return {
    asked,
    context: () => context,
    /** Moves by another key, as an arrow does, which ends the search. */
    move: () => send(generated.EVENT_RESET, {}),
    /** Types a character and returns whether the press is taken. */
    press: (character: string, from = focused) => send(generated.EVENT_TYPE, { character, from }),
    ran,
    state: () => state,
    /** Lets `ms` pass, and ends each deadline that falls due. */
    wait: (ms: number) => {
      now += ms
      for (const [running, end] of [...ends]) {
        const move = end <= now ? typed.expire(state, context, running) : undefined
        if (move !== undefined) {
          perform(move)
        }
      }
    },
  }
}

describe('typeahead', () => {
  /* typeahead.pure.spec.ts: "starts a new word after a pause". Without the
     pause, "cd" matches nothing. */
  test('starts a new word after a pause', () => {
    const paused = host(named('Cambodia', 'Denmark'))
    paused.press('c')
    paused.wait(1000)
    paused.press('d', 'item-0')
    expect(paused.asked).toEqual(['focus item-0', 'select item-0', 'focus item-1', 'select item-1'])
    const quick = host(named('Cambodia', 'Denmark'))
    quick.press('c')
    quick.press('d', 'item-0')
    expect(quick.asked).toEqual(['focus item-0', 'select item-0'])
  })

  /* typeahead.pure.spec.ts: "matches nothing where no item starts with the
     word". The press is still taken, as the controller takes it. */
  test('matches nothing where no item starts with the word', () => {
    const set = host(named('Apple', 'Banana'))
    expect(set.press('z', 'item-0')).toBe(true)
    expect(set.asked).toEqual([])
    expect(set.context()).toEqual({ at: '', letters: 'z' })
  })

  /* typeahead.pure.spec.ts: "reads the words it was given and starts with no
     search under way". */
  test('starts with no search under way', () => {
    expect(typed.start({ at: '', letters: '' })).toBe(idle)
    expect(effectNames(typed, typed.entering(idle))).toEqual([])
  })

  /* typeahead.pure.spec.ts: "holds a search of its own, so two sets never
     share letters". Each host holds its own context. */
  test('holds a search of its own, so two sets never share letters', () => {
    const one = host(named('Canada'))
    const two = host(named('Canada'))
    one.press('c')
    expect(one.state()).toBe(searching)
    expect(two.state()).toBe(idle)
  })

  /* typeahead.pure.spec.ts: "reads an item’s own words, and none where it has
     none". An item with no words is passed over. */
  test('passes over an item with no words', () => {
    const set = host(named('', 'Canada'))
    set.press('c')
    expect(set.asked).toEqual(['focus item-1', 'select item-1'])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "moves to the first item whose
     words start with the letter". */
  test('moves to the first item whose words start with the letter', () => {
    const set = host(named('Apple', 'Banana', 'Cherry'))
    expect(set.press('c')).toBe(true)
    expect(set.asked).toEqual(['focus item-2', 'select item-2'])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "reads letters typed together
     as one word". "ca" lands on the item the search starts from, which moves
     nothing. */
  test('reads letters typed together as one word', () => {
    const set = host(named('Cambodia', 'Canada', 'Chile'))
    set.press('c')
    set.press('a', 'item-0')
    set.press('n', 'item-0')
    expect(set.asked).toEqual(['focus item-0', 'select item-0', 'focus item-1', 'select item-1'])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "moves on through the items
     that start with a letter typed again". */
  test('moves on through the items that start with a letter typed again', () => {
    const set = host(named('Cambodia', 'Canada', 'Chile'))
    set.press('c', 'item-0')
    expect(set.asked).toEqual(['focus item-1', 'select item-1'])
  })

  /* typeahead.ts, on `Typeahead`: "pressing 'c' three times visits the first
     three". A fourth wraps to the first. */
  test('visits the items that start with a letter in turn, and wraps', () => {
    const set = host(named('Cambodia', 'Canada', 'Chile'))
    set.press('c')
    set.press('c', 'item-0')
    set.press('c', 'item-1')
    set.press('c', 'item-2')
    expect(set.asked.filter((one) => one.startsWith('focus'))).toEqual([
      'focus item-0',
      'focus item-1',
      'focus item-2',
      'focus item-0',
    ])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "moves without choosing where
     arriving does not choose". */
  test('moves without choosing where arriving does not choose', () => {
    const set = host(named('Apple', 'Banana'), { selects: false })
    set.press('b')
    expect(set.asked).toEqual(['focus item-1'])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "leaves a Space alone unless a
     word is being typed". */
  test('leaves a Space alone unless a word is being typed', () => {
    const set = host(named('New Haven', 'New York'))
    expect(set.press(' ')).toBe(false)
    set.press('n')
    for (const key of ['e', 'w', ' ', 'y']) {
      expect(set.press(key, 'item-0')).toBe(true)
    }
    expect(set.asked).toEqual(['focus item-0', 'select item-0', 'focus item-1', 'select item-1'])
  })

  /* keyboard-navigation-controller.dom.spec.ts: "leaves a letter alone where
     there is nothing to move to". */
  test('leaves a letter alone where there is nothing to move to', () => {
    const set = host([])
    expect(set.press('a')).toBe(false)
    expect(set.asked).toEqual([])
  })

  /* keyboard-navigation-controller.ts, `handleTypeahead`: a set that starts
     from focus leaves a letter alone where focus is on none of its items. No
     spec covers it. */
  test('leaves a letter alone where the search starts from focus and focus is elsewhere', () => {
    const set = host(named('Apple', 'Banana'), { focus: true })
    expect(set.press('b')).toBe(false)
    expect(set.press('b', 'item-0')).toBe(true)
    expect(set.asked).toEqual(['focus item-1', 'select item-1'])
  })

  /* keyboard-navigation-controller.ts, `handleKeydown`: a move by an arrow,
     Home, or End resets the search. No spec covers it. Without the reset, "ca"
     lands on Canada. */
  test('starts a new word after a move by another key', () => {
    const set = host(named('Apple', 'Cherry', 'Canada'))
    set.press('c')
    set.move()
    set.press('a', 'item-1')
    expect(set.asked).toEqual(['focus item-1', 'select item-1', 'focus item-0', 'select item-0'])
  })

  /* typeahead.ts, `Typeahead.match`: each letter restarts the pause, so the
     search ends half a second after the last letter. The pause of the first
     letter has passed when the search ends. */
  test('starts the pause again with each character, so only the last pause ends the search', () => {
    const set = host(named('Cambodia', 'Canada', 'Chile'))
    set.press('c')
    set.wait(300)
    set.press('a', 'item-0')
    expect(set.ran).toEqual([
      ['focus', 'select', 'deadline'],
      ['deadline-end', 'deadline'],
    ])
    set.wait(300)
    expect(set.context().letters).toBe('ca')
    set.wait(300)
    expect(set.context()).toEqual({ at: '', letters: '' })
  })

  /* keyboard-navigation-controller.ts, `handleKeydown`: the reset ends the
     search at once, so no pause is left to end it. */
  test('ends the pause where a move by another key ends the search', () => {
    const set = host(named('Cambodia'))
    set.press('c')
    set.move()
    expect(set.ran.at(-1)).toEqual(['deadline-end'])
    expect(typed.expire(idle, set.context(), owner)).toBeUndefined()
    set.wait(1000)
    expect(set.ran).toHaveLength(2)
  })
})

/**
 * What the controller does with each character typed after its gap in
 * milliseconds, in a set where arriving chooses: whether it takes the press,
 * and the items it arrives on. Each press starts from the item it last
 * arrived on.
 */
const web = (items: TypeaheadItem[], characters: string, gaps: readonly number[]) => {
  const search = new Typeahead()
  const texts = items.map((item) => item.words)
  let now = 0
  let from = -1
  const arrived: string[] = []
  const taken = [...characters].map((character, index) => {
    now += gaps[index] ?? 0
    if (character === ' ' && !search.typing(now)) {
      return false
    }
    const at = search.match(character, texts, from, now)
    if (at >= 0 && at !== from) {
      from = at
      arrived.push(items[at]?.value ?? '')
    }
    return true
  })
  return { arrived, taken }
}

/** The same, through the machine and a host that keeps time. */
const machine = (items: TypeaheadItem[], characters: string, gaps: readonly number[]) => {
  const set = host(items)
  const taken = [...characters].map((character, index) => {
    set.wait(gaps[index] ?? 0)
    return set.press(character)
  })
  const arrived = set.asked.filter((one) => one.startsWith('focus')).map((one) => one.slice(6))
  return { arrived, taken }
}

/* typeahead.ts, `Typeahead.typing`: a search is under way while the last
   letter is less than half a second old. The earlier format wrote the pause as
   a `wait` effect, a token in the context, and an `EXPIRE` that carried it,
   ignored where its token was stale. The pause is now the deadline of
   `searching`, and each character enters the state again. */
describe('a pause, written as the deadline of searching', () => {
  const countries = named('Apple', 'Cambodia', 'Canada')
  const cities = named('New Haven', 'New York', 'Yemen')

  test('ends the search half a second after the last character, as `Typeahead` does', () => {
    const timelines: [TypeaheadItem[], string, number[]][] = [
      [countries, 'can', [0, 400, 400]],
      [countries, 'ca', [0, 499]],
      [countries, 'ca', [0, 500]],
      [countries, 'ca', [0, 501]],
      [countries, 'ca', [0, 600]],
      [cities, 'new y', [0, 100, 100, 100, 100]],
      [cities, 'new y', [0, 100, 100, 499, 100]],
      [cities, 'new y', [0, 100, 100, 500, 100]],
      [cities, 'new y', [0, 100, 100, 501, 100]],
      [cities, 'new y', [0, 100, 100, 600, 100]],
    ]
    for (const [items, characters, gaps] of timelines) {
      expect({ gaps, ...machine(items, characters, gaps) }).toEqual({
        gaps,
        ...web(items, characters, gaps),
      })
    }
  })

  /* The deadline falls due at exactly 500, before a character typed at that
     moment. At 499 the "a" makes "ca", which Cambodia already starts, and the
     Space makes "new ", which New Haven already starts. At 500 the "a" starts
     a new search and moves to Apple, and the Space is left to the page. */
  test('starts a new search with a character typed exactly half a second after the last', () => {
    expect(machine(countries, 'ca', [0, 499]).arrived).toEqual(['item-1'])
    expect(machine(countries, 'ca', [0, 500]).arrived).toEqual(['item-1', 'item-0'])
    expect(machine(cities, 'new y', [0, 100, 100, 499, 100])).toEqual({
      arrived: ['item-0', 'item-1'],
      taken: [true, true, true, true, true],
    })
    expect(machine(cities, 'new y', [0, 100, 100, 500, 100])).toEqual({
      arrived: ['item-0', 'item-2'],
      taken: [true, true, true, false, true],
    })
  })

  test('starts a deadline of half a second as a character starts a search', () => {
    const move = typed.step(idle, { at: '', letters: '' }, generated.EVENT_TYPE, {
      character: 'c',
      focus: false,
      from: '',
      items: countries,
      selects: true,
    }) as Moved<TypeaheadContext>
    expect(move.effects.at(-1)).toEqual([generated.EFFECT_DEADLINE, { ms: 500, owner }])
    expect(typed.expire(searching, move.context, owner)).toEqual({
      context: { at: '', letters: '' },
      effects: [[generated.EFFECT_DEADLINE_END, { owner }]],
      state: idle,
    })
  })
})
