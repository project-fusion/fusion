import { expect, test } from 'bun:test'

import { exampleShown } from './chat-composer.js'

/* Each example shows for 6.5 seconds, 60 milliseconds more for each character
   past 40, and 10 seconds at the most. */
test('an example shows longer the longer it is, up to 10 seconds', () => {
  expect(exampleShown('')).toBe(6500)
  expect(exampleShown('Fix the failing test')).toBe(6500)
  expect(exampleShown('x'.repeat(40))).toBe(6500)
  expect(exampleShown('x'.repeat(41))).toBe(6560)
  expect(exampleShown('x'.repeat(50))).toBe(7100)
  expect(exampleShown('x'.repeat(98))).toBe(9980)
  expect(exampleShown('x'.repeat(99))).toBe(10000)
  expect(exampleShown('x'.repeat(400))).toBe(10000)
})

test('a character is counted once however many code units it takes', () => {
  expect(exampleShown('🙂'.repeat(50))).toBe(7100)
})
