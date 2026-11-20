import type { PressPointerType } from '../../events/details.js'
import type { Answer, Statechart } from '../statechart.js'

/*
 * Press: the life of one press on a part, from the pointer or key that starts
 * it to the click it ends in. A pointer released over the part, Enter, and
 * Space each make a click. The click goes to the page's listeners first, and
 * where none refuses it the part acts and sends `helix-press` with what
 * pressed it.
 *
 * The web elements do not run this machine. Button's native `<button>` holds
 * the press and makes the click, and Button's own code notes what started the
 * press, swallows the click while pending, acts once the click has finished
 * dispatching unrefused, and names the press with `pressType`. The machine
 * says both halves, so a platform with no native button runs the same press.
 *
 * The request `click` is the platform's `click` event. On the web the
 * browser sends it, and a listener that calls `preventDefault()` refuses it.
 * A host on a platform without one sends a cancelable event of its own.
 *
 * The host keeps the state between events, since no property holds a press
 * in progress. Before each event it writes `disabled`, `holds`, and `pending`
 * from its properties, and it keeps the rest of the context as it is.
 *
 * A pointer and the keys press the part side by side, in two regions, as a
 * native button lets them: Enter or a click while a pointer is held acts, and
 * the release then acts as well. Each region holds one press at a time. No
 * web spec covers two presses at once.
 *
 * A long press claims the next click the part makes, whichever region makes
 * it. A region reads no other region's state, so the claim is `held` in the
 * context, and every click reads it first.
 */

/** How long a pointer is held still before the press is a long press, in milliseconds, as Speed Dial's `LONG_PRESS_DELAY`. */
export const HOLD_DELAY = 500

/** How far a held pointer may drift and still become a long press, in pixels, as Speed Dial's `LONG_PRESS_SLOP`. */
export const HOLD_SLOP = 10

/** What the machine holds between events. */
export interface PressContext {
  /** Whether the part is disabled. A disabled part takes no press and makes no click. */
  disabled: boolean

  /** Whether a long press was heard and claims the next click the part makes, as `LongPress.held`. */
  held: boolean

  /** Whether a primary pointer held still on the part becomes a long press. */
  holds: boolean

  /** Whether Enter or Space started the latest press, which Button notes as `RecentPress.key`. */
  key: boolean

  /** Whether the part is pending. It takes a press and swallows the click the press makes. */
  pending: boolean

  /** The kind of the latest pointer to go down on the part, or `''`, which Button notes as `RecentPress.pointer`. */
  pointer: string

  /** What pressed the part, for the `press` effect: set by the latest press that acted, or `''`. */
  pointerType: PressPointerType | ''

  /** Where the held pointer went down, in pixels, with `y`. */
  x: number
  y: number
}

/** What an event carries. Each event reads only the fields its own line names. */
export interface PressInput {
  /** For `CLICK`: the press count the click carries, its `detail`. */
  count: number

  /** For `KEY_DOWN` and `KEY_UP`: the key, as `KeyboardEvent.key` names it. */
  key: string

  /** For `POINTER_UP`: whether the pointer was released over the part. */
  over: boolean

  /** For `POINTER_DOWN` and `POINTER_UP`, the pointer's kind. For `CLICK`, the kind the click carries, or `''`. */
  pointer: string

  /** For `POINTER_DOWN`: whether the primary button went down. */
  primary: boolean

  /** For `POINTER_DOWN` and `POINTER_MOVE`: where the pointer is, in pixels, with `y`. */
  x: number
  y: number
}

/** The pointer kinds a press is named by as they are. */
const POINTERS: readonly string[] = ['mouse', 'pen', 'touch']

const named = (kind: string): kind is 'mouse' | 'pen' | 'touch' => POINTERS.includes(kind)

/**
 * What a click came from, read as `pressType` reads it: the click's own
 * pointer kind, then a key that started the press, then for a click with a
 * press count the latest pointer or else a mouse, and otherwise `virtual`.
 */
const kindOf = (context: PressContext, own: string, count: number): PressPointerType => {
  if (named(own)) {
    return own
  }
  if (context.key) {
    return 'keyboard'
  }
  if (count > 0) {
    return named(context.pointer) ? context.pointer : 'mouse'
  }
  return 'virtual'
}

/** Names what pressed the part, and forgets what started the press. */
const spent = (context: PressContext, pointerType: PressPointerType): PressContext => ({
  ...context,
  key: false,
  pointer: '',
  pointerType,
})

/** Whether the part takes a press. */
export const enabled = (context: PressContext): boolean => !context.disabled

/** Whether the part acts on a click: it is neither disabled nor pending. */
export const ready = (context: PressContext): boolean => !(context.disabled || context.pending)

/** Whether the next click the part makes goes to a long press. A disabled part makes none. */
export const claims = (context: PressContext): boolean => context.held && enabled(context)

/** Whether the primary button went down on a part that takes a press. */
export const starts = (context: PressContext, input: PressInput): boolean =>
  input.primary && enabled(context)

/** Whether that press may become a long press. */
export const startsHold = (context: PressContext, input: PressInput): boolean =>
  context.holds && starts(context, input)

/** Whether the pointer was released over a part that acts on the click, and no long press takes it. */
export const releasedOver = (context: PressContext, input: PressInput): boolean =>
  input.over && ready(context) && !context.held

/** Whether Enter went down on a part that takes a press. */
export const enterKey = (context: PressContext, input: PressInput): boolean =>
  input.key === 'Enter' && enabled(context)

/** Whether Enter went down on a part that acts on the click Enter makes. */
export const enterClicks = (context: PressContext, input: PressInput): boolean =>
  input.key === 'Enter' && ready(context)

/** Whether Enter went down while a long press claims the click Enter makes. */
export const enterClaimed = (context: PressContext, input: PressInput): boolean =>
  input.key === 'Enter' && claims(context)

/** Whether Space went down on a part that takes a press. */
export const space = (context: PressContext, input: PressInput): boolean =>
  input.key === ' ' && enabled(context)

/** Whether Space came up on a part that acts on the click Space makes. */
export const spaceClicks = (context: PressContext, input: PressInput): boolean =>
  input.key === ' ' && ready(context)

/** Whether Space came up while a long press claims the click Space makes. */
export const spaceClaimed = (context: PressContext, input: PressInput): boolean =>
  input.key === ' ' && claims(context)

/** Whether the key is Space. */
export const isSpace = (_context: PressContext, input: PressInput): boolean => input.key === ' '

/** Whether the pointer has drifted past the slop from where it went down. */
export const drifted = (context: PressContext, input: PressInput): boolean =>
  Math.hypot(input.x - context.x, input.y - context.y) > HOLD_SLOP

/** Notes the kind of pointer that went down, as `notePress` does on `pointerdown`. */
export const notePointer = (context: PressContext, input: PressInput): PressContext => ({
  ...context,
  key: false,
  pointer: input.pointer,
})

/** Notes the pointer that starts a press, which drops a claim the press before left, as `LongPress.down` does. */
export const beginPress = (context: PressContext, input: PressInput): PressContext => ({
  ...notePointer(context, input),
  held: false,
})

/** Notes the pointer that starts a press that may become a long one, and where it went down. */
export const beginHold = (context: PressContext, input: PressInput): PressContext => ({
  ...beginPress(context, input),
  x: input.x,
  y: input.y,
})

/** Notes that a key started the press, as `notePress` does for Enter and Space on `keydown`. */
export const noteKey = (context: PressContext): PressContext => ({
  ...context,
  key: true,
  pointer: '',
})

/** Notes that Enter started the press, and spends the long press's claim on the click Enter makes. */
export const enterTaken = (context: PressContext): PressContext => ({
  ...noteKey(context),
  held: false,
})

/** Notes a long press, which claims the next click the part makes. */
export const claimClick = (context: PressContext): PressContext => ({ ...context, held: true })

/** Spends the long press's claim on a click, or drops it with the press. */
export const dropClaim = (context: PressContext): PressContext => ({ ...context, held: false })

/** Names the press for a click that no press of the machine made: a screen reader's, a script's, or the host's `click()`. */
export const byClick = (context: PressContext, input: PressInput): PressContext =>
  spent(context, kindOf(context, input.pointer, input.count))

/** Names the press for the click a release makes, which carries the pointer's kind and a press count. */
export const byRelease = (context: PressContext, input: PressInput): PressContext =>
  spent(context, kindOf(context, input.pointer, 1))

/** Names the press for the click Enter makes, which Enter has just noted: the keyboard. */
export const byEnter = (context: PressContext): PressContext => spent(context, 'keyboard')

/** Names the press for the click Space makes on its way up, which carries no kind and no count. */
export const bySpace = (context: PressContext): PressContext =>
  spent(context, kindOf(context, '', 0))

type State = 'part' | 'pointerUp' | 'pointing' | 'spaceUp' | 'spacing' | 'timing'

type Pointing = 'POINTER_CANCEL' | 'POINTER_DOWN' | 'POINTER_MOVE' | 'POINTER_UP'

type Event = 'BLUR' | 'CLICK' | 'KEY_DOWN' | 'KEY_UP' | Pointing

/**
 * `act` does what a press does, Button sending its command and submitting or
 * resetting its form. `press` then says what pressed the part, and `hold`
 * says a long press was heard.
 */
type Effect = 'act' | 'hold' | 'press'

type Way = Answer<State, PressContext, PressInput, Effect>

/* Shared answers are named and never read through a property: a bundler keeps
   a property read, and the data would then reach every bundle. */

/** What a pointer's state answers to the events the keys' region answers. */
const keysQuiet = { BLUR: 'ignore', CLICK: 'ignore', KEY_DOWN: 'ignore', KEY_UP: 'ignore' } as const

/** What a key's state answers to the pointer's events. */
const pointerQuiet = {
  POINTER_CANCEL: 'ignore',
  POINTER_DOWN: 'ignore',
  POINTER_MOVE: 'ignore',
  POINTER_UP: 'ignore',
} as const

/** A pointer going down starts a press, which may become a long one. Any other button is only noted. */
const down: Way = [
  { guard: startsHold, target: 'timing', update: beginHold },
  { guard: starts, target: 'pointing', update: beginPress },
  { guard: enabled, update: notePointer },
  'ignore',
]

/** The browser takes the pointer, as when a scroll takes over, which ends the press and its claim. */
const taken: Way = { target: 'pointerUp', update: dropClaim }

/**
 * A held pointer coming up. Over a part that acts, it makes a click. A long
 * press takes the click it makes, and where it makes none the claim ends with
 * the task. Anywhere else, the press ends with none.
 */
const release: Way = [
  {
    accept: { effects: ['act', 'press'], target: 'pointerUp', update: byRelease },
    ask: 'click',
    guard: releasedOver,
    refuse: { target: 'pointerUp' },
  },
  taken,
]

/**
 * Enter clicks as it goes down, and a long press takes the click first. A
 * refused click keeps the note Enter made, as Button does. Space starts a
 * press, and a repeat of Space starts it again.
 */
const keyDown: Way = [
  { guard: enterClaimed, update: enterTaken },
  {
    accept: { effects: ['act', 'press'], update: byEnter },
    ask: 'click',
    guard: enterClicks,
    refuse: { update: noteKey },
  },
  { guard: space, target: 'spacing', update: noteKey },
  { guard: enterKey, update: noteKey },
  'ignore',
]

/**
 * A click no press of the machine made: a screen reader's, a script's, or the
 * host's `click()`. A long press takes it first. The keys' region answers it,
 * since one region answers each event, and the click moves neither region.
 */
const click: Way = [
  { guard: claims, update: dropClaim },
  {
    accept: { effects: ['act', 'press'], update: byClick },
    ask: 'click',
    guard: ready,
    refuse: {},
  },
  'ignore',
]

/** What both states of a held pointer answer alike. */
const pressed = {
  ...keysQuiet,
  POINTER_CANCEL: taken,
  POINTER_DOWN: down,
  POINTER_UP: release,
} as const

/** What both of the keys' states answer alike. */
const keyed = { ...pointerQuiet, CLICK: click, KEY_DOWN: keyDown } as const

/** The machine, written once. `press.generated.ts` is what runs. */
export const press: Statechart<State, Event, PressContext, PressInput, Effect> = {
  effects: ['act', 'press', 'hold'],
  events: [
    'POINTER_DOWN',
    'POINTER_MOVE',
    'POINTER_UP',
    'POINTER_CANCEL',
    'KEY_DOWN',
    'KEY_UP',
    'BLUR',
    'CLICK',
  ],
  initial: [{ target: 'part' }],
  states: {
    part: {
      regions: {
        keys: {
          initial: 'spaceUp',
          states: {
            /* No Space is held on the part. */
            spaceUp: { on: { ...keyed, BLUR: 'ignore', KEY_UP: 'ignore' } },
            /* Space is held on the part, which clicks on its way up. Focus
               leaving ends the press, since the key then comes up somewhere
               else. */
            spacing: {
              on: {
                ...keyed,
                BLUR: { target: 'spaceUp' },
                KEY_UP: [
                  { guard: spaceClaimed, target: 'spaceUp', update: dropClaim },
                  {
                    accept: { effects: ['act', 'press'], target: 'spaceUp', update: bySpace },
                    ask: 'click',
                    guard: spaceClicks,
                    refuse: { target: 'spaceUp' },
                  },
                  { guard: isSpace, target: 'spaceUp' },
                  'ignore',
                ],
              },
            },
          },
        },
        pointer: {
          initial: 'pointerUp',
          states: {
            /* No pointer is held on the part. */
            pointerUp: { on: { ...keysQuiet, ...pointerQuiet, POINTER_DOWN: down } },
            /* A pointer is held on the part, and after a long press the claim
               is `held`. Leaving the part ends nothing: the release decides,
               as the platform clicks only where the pointer went down and
               came up on the part. */
            pointing: { on: { ...pressed, POINTER_MOVE: 'ignore' } },
            /* A primary pointer is held on a part that `holds`. Held for the
               delay, the press is a long press: Speed Dial and Menu open what
               their trigger holds. Drifting past the slop leaves an ordinary
               press. */
            timing: {
              after: { effects: ['hold'], ms: HOLD_DELAY, target: 'pointing', update: claimClick },
              on: { ...pressed, POINTER_MOVE: [{ guard: drifted, target: 'pointing' }, 'ignore'] },
            },
          },
        },
      },
    },
  },
}
