import type { Verdict } from './machine.js'
import { VALID } from './machine.js'

/*
 * What a text field finds wrong with its own text, worked out in JavaScript
 * as HTML's constraint validation works it out, for a platform with no
 * `<input>` to ask: React Native. The web element copies its `<input>`'s
 * verdict instead, and the browser says its own sentences there.
 *
 * The checks and their order are HTML's:
 *
 * - `typeMismatch`, for an `email` or a `url` that does not read as one
 * - `patternMismatch`, for text the `pattern` does not match whole
 * - `tooLong` and `tooShort`, for text the reader typed outside the bounds
 *
 * Empty text fails none of them. A missing answer is the validation
 * machine's own check, and `required` says it.
 */

/** What a text field's own constraint reads. */
export interface TextConstraint {
  /**
   * Whether the reader typed the text, as HTML's dirty value flag says. The
   * length bounds hold only against text the reader typed, so text the page
   * writes is never too short or too long.
   */
  readonly edited: boolean
  /** The most characters the text may have, or `undefined` for no bound. */
  readonly maxLength?: number | undefined
  /** The fewest characters the text may have, or `undefined` for no bound. */
  readonly minLength?: number | undefined
  /** A regular expression the text matches whole, or `''` for none. */
  readonly pattern?: string | undefined
  /** What the text is: `email` and `url` are checked, and every other type is free text. */
  readonly type?: string | undefined
  /** The text. */
  readonly value: string
}

/** The sentences a phone says for each way text fails, which a page may register in its own words. */
export interface TextSentences {
  readonly email: string
  /** The sentence for a required field left empty. */
  readonly missing: string
  readonly pattern: string
  readonly tooLong: (most: number) => string
  readonly tooShort: (fewest: number) => string
  readonly url: string
}

/** Helix's own sentences, in English. */
export const TEXT_SENTENCES: TextSentences = {
  email: 'Enter an email address.',
  missing: 'Fill in the field.',
  pattern: 'Match the format the field asks for.',
  tooLong: (most) => `Use at most ${most} ${most === 1 ? 'character' : 'characters'}.`,
  tooShort: (fewest) => `Use at least ${fewest} ${fewest === 1 ? 'character' : 'characters'}.`,
  url: 'Enter a web address.',
}

/*
 * HTML's valid email address, from the specification's own expression: a
 * local part, `@`, and labels of letters, digits, and hyphens.
 */
const EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/*
 * An absolute URL as a browser parses one: a scheme, a colon, and no space.
 * A phone's runtime has no complete URL parser, and every address a reader
 * types with a scheme and no space parses in a browser.
 */
const URL_LIKE = /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/

/** Whether `value` reads as one email address. */
const readsAsEmail = (value: string): boolean => EMAIL.test(value)

/**
 * The pattern compiled as HTML compiles it: anchored at both ends, with the
 * `v` flag where the engine has it and `u` where it does not. A pattern that
 * does not compile checks nothing, as a browser ignores it.
 */
const compiled = (pattern: string): RegExp | undefined => {
  for (const flags of ['v', 'u']) {
    try {
      return new RegExp(`^(?:${pattern})$`, flags)
    } catch {
      /* The next flag, or none. */
    }
  }
  return undefined
}

/** How many characters the text has, as HTML counts them: UTF-16 code units. */
const lengthOf = (value: string): number => value.length

/**
 * What the text's own constraint finds wrong with it, in Helix's sentences or
 * the ones given: nothing for empty text, then its type, its pattern, and its
 * length, as HTML checks them.
 */
export const textVerdict = (
  constraint: TextConstraint,
  sentences: TextSentences = TEXT_SENTENCES,
): Verdict => {
  const { edited, maxLength, minLength, pattern = '', type = 'text', value } = constraint
  if (value === '') {
    return VALID
  }
  if (type === 'email' && !readsAsEmail(value)) {
    return { flags: ['typeMismatch'], message: sentences.email }
  }
  if (type === 'url' && !URL_LIKE.test(value)) {
    return { flags: ['typeMismatch'], message: sentences.url }
  }
  if (pattern !== '' && compiled(pattern)?.test(value) === false) {
    return { flags: ['patternMismatch'], message: sentences.pattern }
  }
  if (edited && maxLength !== undefined && maxLength >= 0 && lengthOf(value) > maxLength) {
    return { flags: ['tooLong'], message: sentences.tooLong(maxLength) }
  }
  if (edited && minLength !== undefined && minLength > 0 && lengthOf(value) < minLength) {
    return { flags: ['tooShort'], message: sentences.tooShort(minLength) }
  }
  return VALID
}
