import type { Answer, Statechart } from '../statechart.js'

/*
 * Typeahead: while a set of items has focus, a typed character moves to the
 * next item whose words start with the letters typed so far. Letters typed
 * within half a second of each other build one search, so "ca" moves to
 * Canada past Cambodia. One letter typed again moves on through the items
 * that start with it. A pause of half a second ends the search, and so does a
 * move by an arrow key, Home, or End.
 *
 * The pause is the deadline of `searching`. Every character the search takes
 * enters `searching` again, which ends the deadline that was running and
 * starts a new one, so the search ends half a second after the last
 * character, as `Typeahead.typing` reads it.
 *
 * The host sends `TYPE` for a press that types one character with no Control,
 * Command, or Alt held, which no field in the set is typing into: the press
 * `typesCharacter` accepts and `keyClaimed` leaves alone. It sends `RESET`
 * where an arrow key, Home, or End moved focus. A `TYPE` the machine ignores
 * is a press the host leaves to the page, and a `TYPE` it answers is a press
 * the host takes, whether or not it moves. A move that arrives on an item runs
 * `focus`, and `select` after it where arriving chooses, as the controller's
 * `arrive` does. Both act on the item whose value is the context's `at` after
 * the move.
 */

/** An item of the set, as the search reads it. */
export interface TypeaheadItem {
  /** What identifies the item. */
  value: string

  /** The words you type the start of. An item with none is passed over. */
  words: string
}

/** What the machine holds between events. */
export interface TypeaheadContext {
  /** The value of the item the last character moved to, or `''` where it moved nothing. */
  at: string

  /** The letters typed since the last pause, in lower case. `''` where no search is under way. */
  letters: string
}

/** What an event carries. Only `TYPE` reads it. */
export interface TypeaheadInput {
  /** The character typed. */
  character: string

  /** Whether a search starts only from an item with focus. */
  focus: boolean

  /**
   * The value of the item the search starts from: the item with focus where
   * the set starts from focus, and otherwise the chosen item, or the item with
   * focus where nothing is chosen. `''` where there is none.
   */
  from: string

  /** The items you can reach, in order. A disabled item is left out. */
  items: readonly TypeaheadItem[]

  /** Whether arriving on an item also chooses it. */
  selects: boolean
}

/** Text as the search compares it: in lower case, by the rules of no particular language. */
export const fold = (text: string): string => text.toLowerCase()

/**
 * Whether an item's words start with the letters typed, compared as
 * `Typeahead` compares them: the words lose the spaces at either end, and both
 * sides are in lower case. Nothing else is folded, so "e" does not find
 * "École".
 */
export const wordsStartWith = (words: string, letters: string): boolean =>
  fold(words.trim()).startsWith(fold(letters))

/** The letters after a `TYPE`: the letters typed so far and the character, in lower case. */
const lettersAfter = (context: TypeaheadContext, input: TypeaheadInput): string =>
  context.letters + fold(input.character)

/** The index of the item the search starts from, among the items, or -1. */
const fromIndex = (input: TypeaheadInput): number =>
  input.items.findIndex((item) => item.value === input.from)

/**
 * The index of the item the letters land on, or -1 where no item's words
 * start with them.
 *
 * One letter, or one letter repeated, looks for that letter from the item
 * after the one the search starts from, so typing it again moves on through
 * the items that start with it. Any other letters are a word, and the item the
 * search starts from may already be the answer, so the search includes it.
 * The search wraps past the last item.
 */
const landing = (context: TypeaheadContext, input: TypeaheadInput): number => {
  const letters = lettersAfter(context, input)
  const from = fromIndex(input)
  const repeated = [...letters].every((letter) => letter === letters[0])
  const needle = repeated ? (letters[0] ?? '') : letters
  const begin = repeated ? from + 1 : Math.max(from, 0)
  const count = input.items.length
  for (let step = 0; step < count; step += 1) {
    const at = (begin + step) % count
    if (wordsStartWith(input.items[at]?.words ?? '', needle)) {
      return at
    }
  }
  return -1
}

/**
 * The index of the item the search moves to, or -1 where it lands on nothing
 * or on the item it starts from.
 */
const movedTo = (context: TypeaheadContext, input: TypeaheadInput): number => {
  const at = landing(context, input)
  return at === fromIndex(input) ? -1 : at
}

/** Whether a search is under way: letters typed, and no pause or other move since. */
export const searching = (context: TypeaheadContext): boolean => context.letters !== ''

/**
 * Whether the search takes the character.
 *
 * A set with no item to reach leaves it to the page, and so does a set whose
 * search starts from focus where focus is on none of its items. A Space with
 * no search under way is a press, which a set may bind to choosing. Inside a
 * search a Space is part of the words, as in "New York".
 */
export const takes = (context: TypeaheadContext, input: TypeaheadInput): boolean =>
  input.items.length > 0 &&
  !(input.focus && fromIndex(input) < 0) &&
  (input.character !== ' ' || searching(context))

/** Whether the search takes the character and moves to an item other than its start. */
export const moves = (context: TypeaheadContext, input: TypeaheadInput): boolean =>
  takes(context, input) && movedTo(context, input) >= 0

/** Whether the search moves, in a set where arriving on an item also chooses it. */
export const chooses = (context: TypeaheadContext, input: TypeaheadInput): boolean =>
  input.selects && moves(context, input)

/** Adds the character to the letters, and records the item the search moves to. */
export const search = (context: TypeaheadContext, input: TypeaheadInput): TypeaheadContext => ({
  at: input.items[movedTo(context, input)]?.value ?? '',
  letters: lettersAfter(context, input),
})

/** Ends the search, so the next character starts a new one. */
export const clear = (_context: TypeaheadContext): TypeaheadContext => ({ at: '', letters: '' })

type State = 'idle' | 'searching'

type Event = 'RESET' | 'TYPE'

type Effect = 'focus' | 'select'

/*
 * Shared answers are named and never read through a property: a bundler
 * keeps a property read, which might run a getter, and the data would then
 * reach every bundle that imports a function from this module.
 */

/**
 * What both states do with a typed character. Every character the search
 * takes enters `searching`, so its deadline starts again.
 */
const searches: Answer<State, TypeaheadContext, TypeaheadInput, Effect> = [
  { effects: ['focus', 'select'], guard: chooses, target: 'searching', update: search },
  { effects: ['focus'], guard: moves, target: 'searching', update: search },
  { guard: takes, target: 'searching', update: search },
  'ignore',
]

/** The machine, written once. `typeahead.generated.ts` is what runs. */
export const typeahead: Statechart<State, Event, TypeaheadContext, TypeaheadInput, Effect> = {
  effects: ['focus', 'select'],
  events: ['TYPE', 'RESET'],
  initial: [{ guard: searching, target: 'searching' }, { target: 'idle' }],
  states: {
    /* No search is under way: before the first character, and after a pause
       or a move by another key. A Space here is a press of its own. */
    idle: { on: { RESET: 'ignore', TYPE: searches } },
    /* A search is under way. Half a second after the last character it took,
       the search ends. */
    searching: {
      after: { ms: 500, target: 'idle', update: clear },
      on: { RESET: { target: 'idle', update: clear }, TYPE: searches },
    },
  },
}
