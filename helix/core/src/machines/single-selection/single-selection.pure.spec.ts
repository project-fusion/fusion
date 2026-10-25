import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import type { Asked, Moved } from '../reference.js'
import {
  type SelectionContext,
  type SelectionInput,
  type SelectionItem,
  singleSelection,
} from './machine.js'
import * as selectionModule from './single-selection.generated.js'

const selection: Compiled<SelectionContext, SelectionInput> = selectionModule

const item = (value: string, mark = ''): SelectionItem => ({
  disabled: mark === 'disabled',
  selected: mark === 'selected',
  value,
})

/* Every context and input the machine tells apart: nothing current, a current
   item still there, one removed, and one never read; sets with a marked item,
   a disabled neighbor, and nothing enabled at all; and a choice of nothing,
   of the current item, and of another. */
const contexts: SelectionContext[] = []
for (const active of ['', 'a', 'b', 'z']) {
  for (const held of [[], ['a', 'b', 'c']]) {
    contexts.push({ active, held })
  }
}
const sets: SelectionItem[][] = [
  [],
  [item('a'), item('b'), item('c')],
  [item('a'), item('c')],
  [item('a'), item('c', 'disabled')],
  [item('c', 'disabled'), item('a', 'disabled')],
  [item('x'), item('c', 'selected')],
]
const inputs: SelectionInput[] = sets.flatMap((items) =>
  ['', 'a', 'b'].map((value) => ({ items, value })),
)

type Answer = Moved<SelectionContext> | Asked<SelectionContext> | undefined

/** The move an answer makes, where it is a move. */
const moved = (answer: Answer): Moved<SelectionContext> | undefined =>
  answer !== undefined && !('ask' in answer) ? answer : undefined

/** The request an answer makes, where it is a request. */
const asked = (answer: Answer): Asked<SelectionContext> | undefined =>
  answer !== undefined && 'ask' in answer ? answer : undefined

/** A move by names: the state it leaves the machine in, the context, and the effects in order. */
const read = (move: Moved<SelectionContext> | undefined) => ({
  context: move?.context,
  effects: effectNames(selection, move?.effects),
  state: move === undefined ? undefined : selection.STATES[move.state],
})

/** An event sent to the state the host reads from the context. */
const send = (context: SelectionContext, event: number, input: SelectionInput): Answer =>
  selection.step(selection.start(context), context, event, input)

describe('the compiled single-selection module', () => {
  test('numbers the events in the order the machine writes them', () => {
    expect([
      selectionModule.EVENT_CHOOSE,
      selectionModule.EVENT_ITEMS,
      selectionModule.EVENT_SEED,
    ]).toEqual(singleSelection.events.map((_, index) => index))
  })

  test('compiles as the reference reads the machine', () => {
    expect(conforms(singleSelection, selection, contexts, inputs)).toEqual([])
  })

  test('is sampled in every state and on both answers of every guard', () => {
    expect([...coverage(singleSelection, contexts, inputs)].sort()).toEqual([
      'clears false',
      'clears true',
      'differs false',
      'differs true',
      'replaceable false',
      'replaceable true',
      'seedable false',
      'seedable true',
      'settled',
      'unresolved',
    ])
  })
})

describe('single selection', () => {
  const held = { active: 'b', held: ['a', 'b', 'c'] }

  /* tabs-root.dom.spec.ts: "selects the tab after it, which is the tab that
     takes focus". */
  test('hands a removed current item to the next enabled item, and says so', () => {
    const move = send(held, selectionModule.EVENT_ITEMS, {
      items: [item('a'), item('c')],
      value: '',
    })
    expect(read(moved(move))).toEqual({
      context: { active: 'c', held: ['a', 'c'] },
      effects: ['announce'],
      state: 'settled',
    })
  })

  /* tabs-root.dom.spec.ts: "selects a tab that is left, and active says
     which", where the next tab is disabled, and "selects the tab before it
     where it was the last". */
  test('or to the item before it, where the next is disabled or there is none', () => {
    const items = [item('a'), item('c', 'disabled')]
    const past = read(moved(send(held, selectionModule.EVENT_ITEMS, { items, value: '' })))
    expect([past.context?.active, past.effects]).toEqual(['a', ['announce']])
    const last = { active: 'c', held: ['a', 'b', 'c'] }
    const before = send(last, selectionModule.EVENT_ITEMS, {
      items: [item('a'), item('b')],
      value: '',
    })
    expect(moved(before)?.context.active).toBe('b')
  })

  /* tabs-root.ts, in `sync`: "a value naming a tab that has not arrived yet
     is left alone". No dom spec covers it. */
  test('leaves a value naming an item not read yet alone', () => {
    const move = send({ active: 'z', held: [] }, selectionModule.EVENT_ITEMS, {
      items: [item('a')],
      value: '',
    })
    expect(read(moved(move))).toEqual({
      context: { active: 'z', held: ['a'] },
      effects: [],
      state: 'settled',
    })
  })

  /* tabs-root.dom.spec.ts: "is what `active` reports", which also hears no
     `helix-activate`, and "and a tab the markup marked selected is too". */
  test('opens on the item the markup marks, or else the first enabled one', () => {
    const nothing = { active: '', held: [] }
    const marked = [item('a'), item('c', 'selected')]
    expect(
      read(moved(send(nothing, selectionModule.EVENT_SEED, { items: marked, value: '' }))),
    ).toEqual({
      context: { active: 'c', held: [] },
      effects: [],
      state: 'settled',
    })
    const first = [item('a', 'disabled'), item('b')]
    const opened = moved(send(nothing, selectionModule.EVENT_SEED, { items: first, value: '' }))
    expect(opened?.context.active).toBe('b')
  })

  /* video-playlist-examples.dom.spec.ts: "choosing another clip asks to
     activate it, then says it moved". mixin-controllers.dom.spec.ts: "asking
     for what it already holds stands, and announces nothing". */
  test('asks before a choice, and takes no request for the current item', () => {
    const request = asked(send(held, selectionModule.EVENT_CHOOSE, { items: [], value: 'a' }))
    expect(request?.ask.map((code) => selection.ASKS[code])).toEqual(['activate'])
    expect(send(held, selectionModule.EVENT_CHOOSE, { items: [], value: 'b' })).toBeUndefined()
  })
})

describe('what the revised format lets the machine say', () => {
  const nothing = { active: '', held: [] }
  const held = { active: 'b', held: ['a', 'b', 'c'] }

  /* The old format took a refusal as a target, so each state named itself.
     object-inspector-root.dom.spec.ts: "stays where it is when the move is
     refused", and hears no `helix-activate`. */
  test('a refused choice stays where it was, keeps the context, and says nothing', () => {
    for (const [context, value] of [
      [nothing, 'a'],
      [held, 'a'],
      [held, ''],
    ] as const) {
      const request = asked(send(context, selectionModule.EVENT_CHOOSE, { items: [], value }))
      expect(request?.refuse).toEqual({
        context,
        effects: [],
        state: selection.start(context),
      })
    }
  })

  /* `chosen` existed to say a choice on entry. video-playlist-root.dom.spec.ts:
     "says the entry it moved to and the one it left", once. */
  test('an accepted choice says so once and leaves the set settled', () => {
    for (const context of [nothing, held]) {
      const request = asked(send(context, selectionModule.EVENT_CHOOSE, { items: [], value: 'a' }))
      expect(read(request?.accept)).toEqual({
        context: { ...context, active: 'a' },
        effects: ['announce'],
        state: 'settled',
      })
    }
  })

  /* mixin-controllers.dom.spec.ts: "a declared property is a seed, so the
     element announces and still moves", where `active` moves to `''`.
     `requestActive` in mixin-controller-active.ts sends `helix-activate` for
     it. The old machine left the set in `chosen`. */
  test('an accepted choice of nothing says so and leaves the set unresolved', () => {
    const request = asked(send(held, selectionModule.EVENT_CHOOSE, { items: [], value: '' }))
    expect(read(request?.accept)).toEqual({
      context: { ...held, active: '' },
      effects: ['announce'],
      state: 'unresolved',
    })
  })

  /* The host reads the machine from `active` before each event, as
     mixin-controller-active.ts says, so the state a move leaves is the state
     the host reads next. The old `chosen` was a state no context starts in. */
  test('every move leaves the machine in the state its context starts in', () => {
    const outcomes = contexts.flatMap((context) =>
      inputs.flatMap((input) =>
        singleSelection.events.flatMap((_, event) => {
          const answer = send(context, event, input)
          const request = asked(answer)
          return request === undefined ? [moved(answer)] : [request.accept, request.refuse]
        }),
      ),
    )
    const astray = outcomes.filter(
      (move) => move !== undefined && move.state !== selection.start(move.context),
    )
    expect(astray).toEqual([])
    expect(stateOf(selection, 'chosen')).toBe(-1)
  })

  /* A guarded answer now ends in `'ignore'`. resolve-active-item.spec.ts:
     "and gives up rather than choosing one that is out of play", and "resolves
     to nothing rather than throwing" for an empty set. */
  test('a seed with nothing enabled to open on leaves the set unresolved', () => {
    for (const items of [[], [item('a', 'disabled'), item('b', 'disabled')]]) {
      expect(send(nothing, selectionModule.EVENT_SEED, { items, value: '' })).toBeUndefined()
    }
  })
})
