import { describe, expect, test } from '@jest/globals'
import { createElement, Fragment } from 'react'
import { Text } from 'react-native'
import { wordsOf } from './join'

/* An item's words, as the web's `slottedWords` reads its default slot: the
   text of each child, nested elements included, joined by a space. */
describe('wordsOf', () => {
  test('reads the words of nested elements, in order', () => {
    expect(
      wordsOf(
        <Text>
          Be<Text>ta</Text>
        </Text>,
      ),
    ).toBe('Beta')
    expect(wordsOf(['Inbox', <Text key="count">{12}</Text>])).toBe('Inbox 12')
  })

  test('reads a fragment as the children it holds', () => {
    expect(wordsOf(createElement(Fragment, null, 'New', <Text>York</Text>))).toBe('New York')
  })

  test('makes each run of white space one space, and drops what draws nothing', () => {
    expect(wordsOf(['  New\n  York ', false, null, undefined, true])).toBe('New York')
  })

  test('answers no words where the content says none', () => {
    expect(wordsOf(undefined)).toBe('')
    expect(wordsOf(<Text />)).toBe('')
    expect(wordsOf([' ', <Text key="space"> </Text>])).toBe('')
  })
})
