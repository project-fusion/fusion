import { describe, expect, test } from 'bun:test'
import { type Compiled, effectNames } from '../conformance.js'
import type { Moved } from '../reference.js'
import type { ChoiceContext, ChoiceInput, ChoiceItem } from './machine.js'
import * as choiceModule from './multiple-selection.generated.js'

/*
 * Presses and keys, event after event, as the web list's specs make them.
 * `multiple-selection.pure.spec.ts` holds the compiled module to the machine
 * and reads one move at a time, and the two are one spec split at the 400
 * lines a file may have.
 */

const choice: Compiled<ChoiceContext, ChoiceInput> = choiceModule

/** Items by value, where a value ending in `!` is a disabled item. */
const itemsOf = (...values: string[]): ChoiceItem[] =>
  values.map((value) => ({ disabled: value.endsWith('!'), value: value.replace('!', '') }))

/** An input with no key held, from no item. */
const still = { extend: false, from: undefined, toggle: false }

/**
 * A set as the web list runs one: the machine read from its context before
 * each event, every request asked and then accepted or refused, and the
 * effects each move runs.
 */
const host = (set: ChoiceItem[], given: Partial<ChoiceContext> = {}) => {
  let context: ChoiceContext = {
    anchor: undefined,
    behavior: 'toggle',
    disabledBehavior: 'all',
    mode: 'multiple',
    reached: undefined,
    value: '',
    ...given,
  }
  const asked: string[] = []
  const effects: string[] = []
  const held = { refusing: false }
  const send = (event: number, value: string, keys: Partial<ChoiceInput> = {}): boolean => {
    const item = set.find((one) => one.value === value) ?? { disabled: false, value }
    const input = { ...still, item, items: set, ...keys }
    const answer = choice.step(choice.start(context), context, event, input)
    if (answer === undefined) {
      return false
    }
    let move: Moved<ChoiceContext> = answer as Moved<ChoiceContext>
    if ('ask' in answer) {
      asked.push(answer.accept.context.value)
      move = held.refusing ? answer.refuse : answer.accept
    }
    context = move.context
    effects.push(...effectNames(choice, move.effects))
    return true
  }
  return {
    acted: () => effects.filter((effect) => effect === 'act').length,
    all: (value: string) => send(choiceModule.EVENT_ALL, value, { toggle: true }),
    anchor: () => context.anchor,
    announced: () => effects.filter((effect) => effect === 'announce').length,
    arrive: (value: string, from?: string, keys: Partial<ChoiceInput> = {}) =>
      send(choiceModule.EVENT_ARRIVE, value, { ...keys, from }),
    asked,
    clear: (value: string) => send(choiceModule.EVENT_CLEAR, value),
    enter: (value: string) => send(choiceModule.EVENT_ENTER, value),
    held,
    press: (value: string, keys: Partial<ChoiceInput> = {}) =>
      send(choiceModule.EVENT_PRESS, value, keys),
    space: (value: string, keys: Partial<ChoiceInput> = {}) =>
      send(choiceModule.EVENT_SPACE, value, keys),
    value: () => context.value,
  }
}

const five = itemsOf('a', 'b', 'c', 'd', 'e')
const shift = { extend: true }
const control = { toggle: true }

/** What a set of five items asks for, from `given`, after `act`. */
const asks = (given: Partial<ChoiceContext>, act: (set: ReturnType<typeof host>) => void) => {
  const set = host(five, given)
  act(set)
  return set.asked
}

describe('what a press or a key leaves chosen', () => {
  /* selection.pure.spec.ts: "Shift takes in every row from the anchor, after
     what was selected". `choiceValue` leaves `e,b,c,d`, and the list writes
     it in the order of its rows. */
  test('Shift takes in every item from the anchor, after what was chosen', () => {
    expect([
      asks({ anchor: 'b', value: 'e' }, (set) => set.press('d', shift)),
      asks({ anchor: 'd' }, (set) => set.arrive('b', undefined, shift)),
      asks({}, (set) => set.press('c', shift)),
      asks({ anchor: 'a', value: 'a,b' }, (set) => set.press('b', shift)),
    ]).toEqual([['b,c,d,e'], ['b,c,d'], ['c'], []])
  })

  /* selection.pure.spec.ts: "Shift selects the range in place of the last
     one, as React Aria does". */
  test('Shift chooses the range in place of the last one, as React Aria does', () => {
    const sixth = itemsOf('a', 'b', 'x!', 'c', 'd', 'e')
    const disabled = host(sixth, { anchor: 'a', reached: 'd', value: 'a,b,x,c,d' })
    disabled.press('b', shift)
    expect([
      asks({ anchor: 'b', reached: 'e', value: 'b,c,d,e' }, (set) => set.press('c', shift)),
      asks({ anchor: 'c', reached: 'd', value: 'a,c,d' }, (set) => set.press('c', shift)),
      disabled.asked,
    ]).toEqual([['b,c'], ['a,c'], ['a,b']])
  })

  /* selection.pure.spec.ts: "toggle adds or takes out a pressed row, and a
     key only moves". */
  test('toggle adds or takes out a pressed item, and a key only moves', () => {
    expect([
      asks({ value: 'a' }, (set) => set.press('c')),
      asks({ value: 'a,c' }, (set) => set.press('a')),
      asks({ value: 'a' }, (set) => set.arrive('c')),
    ]).toEqual([['a,c'], ['c'], []])
  })

  /* selection.pure.spec.ts: "replace selects the row alone, by a press or a
     key". */
  test('replace chooses the item alone, by a press or a key', () => {
    expect([
      asks({ behavior: 'replace', value: 'a,b' }, (set) => set.press('c')),
      asks({ behavior: 'replace', value: 'c' }, (set) => set.arrive('d')),
      asks({ behavior: 'replace', value: 'c' }, (set) => set.press('c')),
    ]).toEqual([['c'], ['d'], []])
  })

  /* selection.pure.spec.ts: "replace with Control or Command toggles a press
     and leaves a key alone". */
  test('replace with Control or Command toggles a press and leaves a key alone', () => {
    expect([
      asks({ behavior: 'replace', value: 'a' }, (set) => set.press('c', control)),
      asks({ behavior: 'replace', value: 'a' }, (set) => set.arrive('c', undefined, control)),
    ]).toEqual([['a,c'], []])
  })

  /* selection.pure.spec.ts: "a single list ignores Shift, and a list that
     selects nothing changes nothing". The list acts on that press. */
  test('a single set ignores Shift, and a set that chooses nothing changes nothing', () => {
    const none = host(five, { mode: 'none' })
    none.press('c')
    expect([
      asks({ anchor: 'a', mode: 'single', value: 'a' }, (set) => set.press('c', shift)),
      none.asked,
      none.acted(),
    ]).toEqual([['c'], [], 1])
  })
})

describe('a list that selects', () => {
  /* list-interactive.dom.spec.ts: "a press selects, asking first, and a
     refusal keeps the selection". */
  test('a press chooses, asking first, and a refusal keeps the value', () => {
    const list = host(itemsOf('a', 'b!', 'c'))
    list.press('a')
    list.press('c')
    expect([list.asked, list.value(), list.announced()]).toEqual([['a', 'a,c'], 'a,c', 2])
    list.held.refusing = true
    list.press('a')
    expect([list.value(), list.announced()]).toEqual(['a,c', 2])
  })

  /* list-interactive.dom.spec.ts: "a disabled row is announced as disabled and
     cannot be selected". */
  test('a disabled item cannot be chosen, and a press on it does nothing', () => {
    const list = host(itemsOf('a', 'b!', 'c'), { mode: 'single' })
    list.press('b')
    expect([list.asked, list.acted()]).toEqual([[], 0])
  })

  /* list-interactive.dom.spec.ts: "a list that selects nothing acts on a
     press, and says nothing about selection". */
  test('a set that chooses nothing acts on a press', () => {
    const list = host(itemsOf('a', 'b!', 'c'), { mode: 'none' })
    list.press('a')
    expect([list.acted(), list.value()]).toEqual([1, ''])
  })

  /* list-interactive.dom.spec.ts: "under disabled-behavior="selection" a
     disabled row is reached and acted on, and never selected". */
  test('under disabled-behavior="selection" a disabled item is acted on and never chosen', () => {
    const list = host(itemsOf('a', 'b!', 'c'), { disabledBehavior: 'selection' })
    list.enter('b')
    list.space('b')
    list.press('b')
    expect([list.acted(), list.value()]).toEqual([2, ''])
    list.all('b')
    expect(list.value()).toBe('a,c')
  })

  /* list-interactive.dom.spec.ts: "Space selects the row and Enter acts on
     it". */
  test('Space chooses the item and Enter acts on it', () => {
    const list = host(itemsOf('a', 'b!', 'c'), { mode: 'single' })
    list.space('a')
    expect(list.value()).toBe('a')
    list.enter('a')
    expect(list.acted()).toBe(1)
  })

  /* list-interactive.dom.spec.ts: "Shift with Down takes in each row it
     reaches, past a disabled one". Focus starts on `a`, put there by a
     script, so the first range runs from it. */
  test('Shift with Down takes in each item it reaches, past a disabled one', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.arrive('b', 'a', shift)
    expect(list.value()).toBe('a,b')
    list.arrive('d', 'b', shift)
    expect(list.value()).toBe('a,b,d')
  })

  /* list-interactive.dom.spec.ts: "Shift with Up back toward the anchor lets
     go of the rows the range passed, and keeps the rest". */
  test('Shift with Up back toward the anchor lets go of the items the range passed, and keeps the rest', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.press('e')
    list.press('a')
    list.arrive('b', 'a', shift)
    list.arrive('d', 'b', shift)
    expect(list.value()).toBe('a,b,d,e')
    list.arrive('b', 'd', shift)
    expect(list.value()).toBe('a,b,e')
    list.arrive('a', 'b', shift)
    expect(list.value()).toBe('a,e')
  })

  /* list-interactive.dom.spec.ts: "Shift with a press or Space takes in the
     rows from the last one pressed". */
  test('Shift with a press or Space takes in the items from the last one pressed', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.press('a')
    list.press('e', shift)
    expect(list.value()).toBe('a,b,d,e')
    list.press('d')
    expect(list.value()).toBe('a,b,e')
    list.space('a', shift)
    expect(list.value()).toBe('a,b,d,e')
  })

  /* list-interactive.dom.spec.ts: "writes its value in row order, whatever
     order the rows were chosen in, as Data Table does". */
  test('writes the value in the order of the items, whatever order they were chosen in', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.press('d')
    list.press('a')
    expect([list.asked, list.value()]).toEqual([['d', 'a,d'], 'a,d'])
  })

  /* list-interactive.dom.spec.ts: "Control or Command with A selects every
     row a key can reach". */
  test('Control or Command with A chooses every item a reader can choose, once', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.all('a')
    list.all('a')
    expect([list.asked, list.value()]).toEqual([['a,b,d,e'], 'a,b,d,e'])
  })

  /* list-interactive.dom.spec.ts: "Page Down and Page Up move a box of rows,
     and Shift takes them in". The page keys arrive as an arrow does. */
  test('Page Down and Page Up arrive as an arrow does, and Shift takes in the items', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'))
    list.arrive('e', 'a', shift)
    expect(list.value()).toBe('a,b,d,e')
    list.arrive('a', 'e')
    expect([list.asked, list.value()]).toEqual([['a,b,d,e'], 'a,b,d,e'])
  })

  /* list-interactive.dom.spec.ts: "Page Down under replace selects the row it
     lands on". */
  test('Page Down under replace chooses the item it lands on', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'), { behavior: 'replace' })
    list.arrive('e', 'a')
    expect(list.value()).toBe('e')
  })

  /* list-interactive.dom.spec.ts: "Escape lets go of the selection, asking
     first, and only then keeps the key". The list keeps the key where the
     machine answers it. */
  test('Escape lets go of the value, asking first, and answers nothing once it is empty', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'), { value: 'a,d' })
    list.held.refusing = true
    expect(list.clear('a')).toBe(true)
    expect(list.value()).toBe('a,d')
    list.held.refusing = false
    expect(list.clear('a')).toBe(true)
    expect(list.value()).toBe('')
    expect(list.clear('a')).toBe(false)
  })

  /* list-interactive.dom.spec.ts: "replace selects a pressed row alone, and
     the keys carry the selection". */
  test('replace chooses a pressed item alone, and the keys carry the selection', () => {
    const list = host(itemsOf('a', 'b', 'c!', 'd', 'e'), { behavior: 'replace' })
    list.press('a')
    list.press('b')
    expect(list.value()).toBe('b')
    list.arrive('d', 'b')
    expect(list.value()).toBe('d')
    list.arrive('b', 'd', control)
    expect(list.value()).toBe('d')
    list.press('a', control)
    expect(list.value()).toBe('a,d')
  })

  /* list-root.ts, `press`: the row is where the next range runs from before
     the change is asked for, so a refused press still moves it. */
  test('a refused press still moves where the next range runs from', () => {
    const list = host(itemsOf('a', 'b', 'c', 'd'), { anchor: 'a' })
    list.held.refusing = true
    list.press('c')
    list.held.refusing = false
    list.press('d', shift)
    expect(list.value()).toBe('c,d')
  })
})

describe('the anchor, carried by the event that moves it', () => {
  /* list-root.ts, `arrive`: without Shift, a row that changes the value is
     where the next range runs from before the change is asked for, so a
     refused arrival still moves it. */
  test('a refused arrival still moves where the next range runs from', () => {
    const list = host(five, { anchor: 'a', behavior: 'replace', value: 'a' })
    list.held.refusing = true
    list.arrive('c', 'b')
    expect([list.value(), list.anchor()]).toEqual(['a', 'c'])
    list.held.refusing = false
    list.press('e', shift)
    expect(list.value()).toBe('a,c,d,e')
  })

  /* list-root.ts, `arrive`: with Shift and no anchor yet, the row focus left
     is where the range runs from before the change is asked for, so a
     refused arrival still sets it. */
  test('a refused arrival with Shift still starts the range from the item focus left', () => {
    const list = host(five)
    list.held.refusing = true
    list.arrive('c', 'b', shift)
    expect([list.asked, list.value(), list.anchor()]).toEqual([['b,c'], '', 'b'])
    list.held.refusing = false
    list.press('d', shift)
    expect(list.value()).toBe('b,c,d')
  })

  /* list-root.ts, `press`: the row is where the next range runs from whether
     or not `choiceValue` changes anything. */
  test('a press or Space that changes nothing still moves where the next range runs from', () => {
    const pressed = host(five, { anchor: 'a', behavior: 'replace', value: 'c' })
    const spaced = host(five, { anchor: 'a', behavior: 'replace', value: 'c' })
    expect([pressed.press('c'), spaced.space('c')]).toEqual([true, true])
    expect([pressed.asked, spaced.asked, pressed.anchor(), spaced.anchor()]).toEqual([
      [],
      [],
      'c',
      'c',
    ])
    pressed.press('e', shift)
    expect(pressed.value()).toBe('c,d,e')
  })

  /* list-root.ts, `arrive`: with Shift and no anchor yet, the row focus left
     becomes the anchor even where the range adds nothing. */
  test('an arrival with Shift that adds nothing still starts the range from the item focus left', () => {
    const list = host(five, { value: 'b,c' })
    expect([list.arrive('c', 'b', shift), list.asked, list.anchor()]).toEqual([true, [], 'b'])
  })
})
