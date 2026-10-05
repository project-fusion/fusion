import { fillTemplate } from '@fusion.dev/helix-core'

/*
 * What a screen reader calls a turn, as arithmetic over its author and its
 * time. Pure and beside the family's `index.ts`, because the name is a fact
 * about two strings and a template, and a spec can hold it without a page.
 */

/** What the chat names its turns with, which it hands to each of them. */
export interface TurnWords {
  /** The word for `me`, such as "You". */
  me: string
  /** The sentence for a turn with an author and a time, with `{author}` and `{time}`. */
  sentence: string
}

/** The words a chat says its turns with, where nobody said otherwise. */
export const TURN_WORDS: TurnWords = { me: 'You', sentence: '{author}, {time}' }

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
 * and whichever of the two it has otherwise. Empty where it has neither.
 */
export const turnName = (author: string, time: string, words: TurnWords): string =>
  author !== '' && time !== '' ? fillTemplate(words.sentence, { author, time }) : author || time
