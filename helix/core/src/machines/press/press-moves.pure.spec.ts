import { describe, expect, test } from 'bun:test'
import { pressType } from '../../utils/press-type/press-type.js'
import { type Compiled, effectNames } from '../conformance.js'
import type { Asked, Moved } from '../reference.js'
import { HOLD_SLOP, type PressContext, type PressInput } from './machine.js'
import * as generated from './press.generated.js'

/*
 * Drives the compiled module through the presses the web specs describe, as
 * a host does, and through what the old format could not say.
 */

const compiled: Compiled<PressContext, PressInput> = generated

const STILL = { count: 0, key: '', over: false, pointer: '', primary: false, x: 0, y: 0 }

const PART: PressContext = {
  disabled: false,
  held: false,
  holds: false,
  key: false,
  pending: false,
  pointer: '',
  pointerType: '',
  x: 0,
  y: 0,
}

/** The wait for a long press ending, which the host's timers send. */
const ENDS = -1

/** The state `timing`, which owns the deadline. */
const TIMING = compiled.NODES.indexOf('timing')

/** What a host sends: an event, what it carries, and the properties it writes first. */
type Send = readonly [event: number, input?: Partial<PressInput>, host?: Partial<PressContext>]

/** What the machine answers one send with. */
const answer = (state: number, context: PressContext, [event, input = {}]: Send) =>
  event === ENDS
    ? compiled.expire(state, context, TIMING)
    : compiled.step(state, context, event, { ...STILL, ...input })

/** The move a host makes of an answer, given whether a listener refuses the click. */
const outcome = (found: Moved<PressContext> | Asked<PressContext>, refuse = false) =>
  'ask' in found ? found[refuse ? 'refuse' : 'accept'] : found

/** A move's effects by name, with what pressed the part on `press`. */
const named = (move: Moved<PressContext>): string[] =>
  effectNames(compiled, move.effects).map((name) =>
    name === 'press' ? `press ${move.context.pointerType}` : name,
  )

/**
 * Sends each event in turn from where the machine starts, as a host does,
 * writing each request and effect on the trail. Each click is accepted, or
 * refused where `refused` says so, in the order they are asked.
 */
const drive = (sends: Send[], from: Partial<PressContext> = {}, refused: boolean[] = []) => {
  let context: PressContext = { ...PART, ...from }
  let state = compiled.start(context)
  const trail: string[] = []
  const refusals = [...refused]
  for (const send of sends) {
    context = { ...context, ...send[2] }
    const found = answer(state, context, send)
    if (found === undefined) {
      continue
    }
    const asks = 'ask' in found ? found.ask.map((code) => `${compiled.ASKS[code]}`) : []
    const move = outcome(found, asks.length > 0 && refusals.shift() === true)
    trail.push(...asks, ...named(move))
    ;({ context, state } = move)
  }
  return { context, state: compiled.STATES[state], trail }
}

const down = (pointer = 'mouse'): Send => [generated.EVENT_POINTER_DOWN, { pointer, primary: true }]
const up = (over = true, pointer = ''): Send => [generated.EVENT_POINTER_UP, { over, pointer }]
const click = (pointer = '', count = 0): Send => [generated.EVENT_CLICK, { count, pointer }]
const key = (name: string, event = generated.EVENT_KEY_DOWN): Send => [event, { key: name }]
const keyUp = (name: string): Send => key(name, generated.EVENT_KEY_UP)
const expire: Send = [ENDS]

/** The same event, with the properties the host writes before it. */
const writing = (send: Send, host: Partial<PressContext>): Send => [send[0], send[1] ?? {}, host]

/** What a click that acts writes on the trail, with what pressed the part. */
const acts = (by: string): string[] => ['click', 'act', `press ${by}`]

/* Restated from `helix/headless/src/button/root/button-root.dom.spec.ts`. */
describe('a press on Button', () => {
  /* "a script click is virtual, and a click after Enter is the keyboard", and
     "the host’s own click() presses it, and is virtual": the host's `click()`
     clicks the inner control, which is a `CLICK` here. */
  test('a script click is virtual, and the click Enter makes is the keyboard', () => {
    expect(drive([click(), key('Enter'), click()]).trail).toEqual([
      ...acts('virtual'),
      ...acts('keyboard'),
      ...acts('virtual'),
    ])
  })

  /* "a click after a pen goes down is the pen": the click carries a count
     and no kind, as Safari sends it. */
  test('a click after a pen goes down is the pen', () => {
    expect(drive([down('pen'), up(true, '')]).trail).toEqual(acts('pen'))
  })

  /* "a pending button sends none", and "a press reaches no listener and
     submits nothing", which presses again once the wait is over. */
  test('a pending part swallows the click, and acts on the next once the wait is over', () => {
    expect(drive([click()], { pending: true }).trail).toEqual([])
    const over = writing(click(), { pending: false })
    expect(drive([click(), over], { pending: true }).trail).toEqual(acts('virtual'))
  })

  /* "and a disabled host’s click() does nothing". */
  test('a disabled part takes no click', () => {
    expect(drive([click(), down(), up(), key('Enter')], { disabled: true }).trail).toEqual([])
  })

  /* "a click listener that prevents the default cancels a submit or a reset",
     and "a click listener that prevents the default sends no command". */
  test('a refused click does not act, sends no press, and keeps what started the press', () => {
    const { context, trail } = drive([down('touch'), up()], {}, [true])
    expect(trail).toEqual(['click'])
    expect(context).toEqual({ ...PART, pointer: 'touch' })
  })
})

/* Restated from `helix/core/src/utils/press-type/press-type.pure.spec.ts`. */
describe('what pressed the part', () => {
  const by = (send: Send, from: Partial<PressContext> = {}) =>
    drive([send], from).context.pointerType

  test('a pointer kind on the click is the answer', () => {
    const kinds = ['mouse', 'touch', 'pen'] as const
    expect(kinds.map((kind) => by(click(kind, 1)))).toEqual([...kinds])
  })

  test('a click a key started is the keyboard, with no kind and no count', () => {
    expect(by(click(), { key: true })).toBe('keyboard')
  })

  test('a click with nothing behind it is virtual: a screen reader or a script', () => {
    expect(by(click())).toBe('virtual')
    expect(by(click(), { pointer: 'touch' })).toBe('virtual')
  })

  test('a counted click without a kind takes the last pointer, or a mouse, as Safari sends it', () => {
    expect(by(click('', 1), { pointer: 'touch' })).toBe('touch')
    expect(by(click('', 1))).toBe('mouse')
  })
})

/* No Helix spec covers these: the browser does them for Button's native
   control, and each restates what it does. */
describe('the press a native button holds', () => {
  test('a pointer released over the part clicks it, and one released elsewhere or taken does not', () => {
    expect(drive([down(), up(true, 'mouse')]).trail).toEqual(acts('mouse'))
    expect(drive([down(), up(false)]).trail).toEqual([])
    expect(drive([down('touch'), [generated.EVENT_POINTER_CANCEL], up()]).trail).toEqual([])
  })

  test('Space clicks on its way up, and focus leaving first ends the press', () => {
    expect(drive([key(' '), keyUp(' ')]).trail).toEqual(acts('keyboard'))
    expect(drive([key(' '), [generated.EVENT_BLUR], keyUp(' ')]).trail).toEqual([])
  })

  /* Button reads `pending` at the click, in `handleClick`. */
  test('reads disabled and pending at the release', () => {
    expect(drive([down(), writing(up(), { disabled: true })]).trail).toEqual([])
    expect(drive([down(), writing(up(), { pending: true })]).trail).toEqual([])
    const back = [writing(down(), { pending: true }), writing(up(true, 'pen'), { pending: false })]
    expect(drive(back).trail).toEqual(acts('pen'))
  })
})

/* Restated from `helix/headless/src/speed-dial/long-press.dom.spec.ts`, and
   "leaves a quick press to the trigger, and opens on a held one without the
   press" in `speed-dial-root.dom.spec.ts`. The host's timers start the wait
   on `deadline` and drop it on `deadline-end`. */
describe('a long press', () => {
  const holds = { holds: true }
  const heard = ['deadline', 'deadline-end', 'hold']

  test('is heard once the press is held for the delay, and takes the click it ends in once', () => {
    expect(drive([down(), expire, up(), click()], holds).trail).toEqual([
      ...heard,
      ...acts('virtual'),
    ])
  })

  /* The release leaves `timing`, which ends the wait before the part acts. */
  test('a press released before the delay is an ordinary one', () => {
    expect(drive([down(), up(true, 'mouse'), expire], holds).trail).toEqual([
      ...['deadline', 'click'],
      ...['deadline-end', 'act', 'press mouse'],
    ])
  })

  test('a pointer that drifts past the slop is scrolling, and a secondary button never counts', () => {
    const drift: Send = [generated.EVENT_POINTER_MOVE, { x: HOLD_SLOP + 1 }]
    const still: Send = [generated.EVENT_POINTER_MOVE, { x: HOLD_SLOP }]
    expect(drive([down(), still, drift, expire], holds).trail).toEqual(['deadline', 'deadline-end'])
    const secondary: Send = [generated.EVENT_POINTER_DOWN, { pointer: 'mouse' }]
    expect(drive([secondary, expire], holds).trail).toEqual([])
  })

  /* "a held press that makes no click gives up its claim when the task ends". */
  test('a held press that makes no click gives up its claim', () => {
    expect(drive([down(), expire, up(false), click()], holds).trail).toEqual([
      ...heard,
      ...acts('virtual'),
    ])
  })

  /* The old machine kept this rule with a token on each wait. */
  test('ends the wait as the press ends, so an earlier wait hears nothing', () => {
    expect(drive([down(), up(false), expire, down(), expire], holds).trail).toEqual([
      ...['deadline', 'deadline-end'],
      ...heard,
    ])
  })

  /* No web spec covers it: `LongPress.takeClick` in `long-press.ts` takes the
     first click after a long press, whatever made it. */
  test('takes Enter while the pointer is still held, and the release then acts', () => {
    expect(drive([down(), expire, key('Enter'), up(true, 'mouse')], holds).trail).toEqual([
      ...heard,
      ...acts('mouse'),
    ])
  })
})

/* The workarounds the old format forced that a press shows, and what the web
   does in their place. */
describe('the press as the revised format says it', () => {
  /* `notePress` writes `RecentPress.key` on `keydown`, and only a click that
     acts clears it, in `button-root.ts`. The old machine could not change
     the context on a refusal, and lost the note. */
  test('a refused Enter keeps the note Enter made, which a later click reads, as Button does', () => {
    expect(drive([key('Enter')], {}, [true]).context).toEqual({ ...PART, key: true })
    expect(drive([key('Enter'), click()], {}, [true]).trail).toEqual(['click', ...acts('keyboard')])
    const script = { detail: 0, pointerType: '' } as unknown as MouseEvent
    expect(pressType(script, { key: true })).toBe('keyboard')
  })

  /* A native button keeps a pointer's press and a key's apart, and Button
     acts on each click that reaches it, in `handleClick`. The old machine
     ended the pointer's press. */
  test('Enter or a click while a pointer is held acts, and the release acts as well', () => {
    expect(drive([down('pen'), key('Enter'), up(true, 'pen')]).trail).toEqual([
      ...acts('keyboard'),
      ...acts('pen'),
    ])
    expect(drive([down('pen'), click(), up(true, 'pen')]).trail).toEqual([
      ...acts('virtual'),
      ...acts('pen'),
    ])
  })

  /* Button keeps one note, `recent`, and the first click that acts clears
     it. Space's click then carries no kind and no count, and is virtual. */
  test('Space and a pointer press the part side by side, and each clicks as it ends', () => {
    const { state, trail } = drive([down('touch'), key(' '), keyUp(' '), up(true, 'touch')])
    expect(trail).toEqual([...acts('keyboard'), ...acts('touch')])
    expect(state).toBe('part(spaceUp, pointerUp)')
    expect(drive([down('touch'), key(' '), up(true, 'touch'), keyUp(' ')]).trail).toEqual([
      ...acts('touch'),
      ...acts('virtual'),
    ])
  })

  /* `LongPress.takeClick` in `long-press.ts`, which Speed Dial's and Menu's
     `handleHeldClick` read ahead of every click. */
  test('a long press takes the first click, whichever region makes it', () => {
    const sends = [down(), expire, key(' '), keyUp(' '), up(true, 'mouse')]
    expect(drive(sends, { holds: true }).trail).toEqual([
      ...['deadline', 'deadline-end', 'hold'],
      ...acts('mouse'),
    ])
  })
})
