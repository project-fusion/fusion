import { formatMessage } from '../../words/index.js'

export { relativeTime } from '../relative-time/relative-time.js'

/*
 * What a screen reader calls a turn, and which turns it is told as they arrive,
 * as arithmetic the web element and a phone both read. Pure, because each is a
 * fact about strings and a list, and a spec can hold it without a page.
 */

/** What the chat names its turns with, which it hands to each of them. */
export interface TurnWords {
  /** The word for `me`, such as "You". */
  me: string
  /** The sentence for a turn with an author and a time, with `{author}` and `{time}`. */
  sentence: string
  /** The name of a turn with neither an author a reader can be told nor a time. */
  turn: string
}

/** The words a chat says its turns with, where nobody said otherwise. */
export const TURN_WORDS: TurnWords = { me: 'You', sentence: '{author}, {time}', turn: 'Message' }

/**
 * Who wrote a turn, in words: its `author-label`, or else the chat's word for
 * `me`, or else the `author` itself where it is a name.
 *
 * `them` is the other side of a two-sided conversation and not a name, so it
 * says nothing until it is given an `author-label`.
 */
export const authorWords = (
  author: string | undefined,
  authorLabel: string,
  words: TurnWords,
): string => {
  if (authorLabel !== '') {
    return authorLabel
  }
  if (author === 'me') {
    return words.me
  }
  return author === undefined || author === 'them' ? '' : author
}

/**
 * The turn's accessible name: the sentence where it has an author and a time,
 * and whichever of the two it has otherwise. Where it has neither, a turn by
 * `them` with no `author-label` and no time, the chat's word for a turn, so
 * no turn is an `article` with no name.
 */
export const turnName = (author: string, time: string, words: TurnWords): string =>
  author !== '' && time !== ''
    ? formatMessage(words.sentence, { author, time }, '')
    : author || time || words.turn

/** A turn as the announcer reads it, whichever way it was handed over. */
export interface HeardTurn {
  readonly author: string | undefined
  /** Who wrote it, in words a reader can be told, or empty where there are none. */
  readonly by: string
  readonly failed: string
  readonly id: unknown
  readonly state: string | undefined
  readonly text: string
}

/** What the announcer has accounted for: the newest turn, and the turns still arriving. */
export interface TurnMemory {
  readonly newest: unknown
  readonly pending: ReadonlySet<unknown>
}

/** Whether a turn has finished arriving, which is when it is worth saying. */
const settled = (turn: HeardTurn): boolean => turn.state !== 'sending' && turn.state !== 'streaming'

/**
 * Whether a turn is news to the reader.
 *
 * Their own words are not, since they have just written them, unless those
 * words did not send: a failure is the one thing about their own turn a reader
 * has to be told.
 */
const newsworthy = (turn: HeardTurn): boolean => turn.author !== 'me' || turn.state === 'failed'

/** What the announcer holds of the turns a transcript opened with, none of which is said. */
export const openingTurns = (turns: readonly HeardTurn[]): TurnMemory => ({
  newest: turns.at(-1)?.id,
  pending: new Set(turns.filter((turn) => !settled(turn)).map((turn) => turn.id)),
})

/**
 * The turns after the newest one already accounted for. Where the newest turn
 * is gone the set was replaced, and where nothing was accounted for several at
 * once are a transcript loading. Neither is said.
 */
const arrived = (turns: readonly HeardTurn[], newest: unknown): readonly HeardTurn[] => {
  if (newest === undefined) {
    return turns.length === 1 ? turns : []
  }
  const at = turns.findIndex((turn) => turn.id === newest)
  return at < 0 ? [] : turns.slice(at + 1)
}

/**
 * The turns that have settled since the last look, and what to hold for the next.
 *
 * **New means after the newest turn already accounted for.** Turns loaded above
 * it are history and are not said. A turn still `sending` or `streaming` waits,
 * and is said when it settles.
 */
export const turnsToSay = (
  turns: readonly HeardTurn[],
  memory: TurnMemory,
): { readonly memory: TurnMemory; readonly say: readonly HeardTurn[] } => {
  const fresh = arrived(turns, memory.newest)
  const pending = new Set(memory.pending)
  const say: HeardTurn[] = []
  for (const turn of turns) {
    if (pending.has(turn.id) && settled(turn) && !fresh.includes(turn)) {
      pending.delete(turn.id)
      if (newsworthy(turn)) {
        say.push(turn)
      }
    }
  }
  for (const turn of fresh) {
    if (!settled(turn)) {
      pending.add(turn.id)
    } else if (newsworthy(turn)) {
      say.push(turn)
    }
  }
  const present = new Set(turns.map((turn) => turn.id))
  return {
    memory: {
      newest: turns.at(-1)?.id,
      pending: new Set([...pending].filter((id) => present.has(id))),
    },
    say,
  }
}

/** Declarations written as text, `--a: b; c: d`, as a phone sets them on a style. */
export const declarationsOf = (text: string | undefined): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {}
  for (const one of (text ?? '').split(';')) {
    const colon = one.indexOf(':')
    if (colon > 0) {
      out[one.slice(0, colon).trim()] = one.slice(colon + 1).trim()
    }
  }
  return out
}
