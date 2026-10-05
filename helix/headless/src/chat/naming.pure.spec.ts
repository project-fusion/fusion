import { describe, expect, test } from 'bun:test'
import { authorWords, TURN_WORDS, turnName } from './naming.js'

/* What a screen reader calls a turn, which is who wrote it and when. */

describe('who wrote a turn', () => {
  test('the author label is the name, whatever the author is', () => {
    expect(authorWords('them', 'Support', TURN_WORDS)).toBe('Support')
    expect(authorWords('me', 'Ada', TURN_WORDS)).toBe('Ada')
  })

  test('me is the chat’s word for the reader', () => {
    expect(authorWords('me', '', TURN_WORDS)).toBe('You')
    expect(authorWords('me', '', { ...TURN_WORDS, me: 'Vous' })).toBe('Vous')
  })

  test('an author written as a name is said as written', () => {
    expect(authorWords('Grace Hopper', '', TURN_WORDS)).toBe('Grace Hopper')
  })

  /* `them` is a side of the conversation and not a name, so a turn by them is
     named by its time until it is given a label. */
  test('them and no author say nothing', () => {
    expect(authorWords('them', '', TURN_WORDS)).toBe('')
    expect(authorWords(undefined, '', TURN_WORDS)).toBe('')
  })
})

describe('the name of a turn', () => {
  test('an author and a time make the sentence', () => {
    expect(turnName('You', '2 minutes ago', TURN_WORDS)).toBe('You, 2 minutes ago')
  })

  test('the sentence is the chat’s, in its order', () => {
    expect(turnName('Ada', 'hier', { me: 'Vous', sentence: '{time}, {author}' })).toBe('hier, Ada')
  })

  test('one of the two is the name alone', () => {
    expect(turnName('Ada', '', TURN_WORDS)).toBe('Ada')
    expect(turnName('', 'yesterday', TURN_WORDS)).toBe('yesterday')
  })

  test('neither is no name', () => {
    expect(turnName('', '', TURN_WORDS)).toBe('')
  })
})
