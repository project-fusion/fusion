import { describe, expect, test } from 'bun:test'
import { onUnlessFalse } from './on-unless-false.js'

describe('a boolean that is on unless told otherwise', () => {
  test('is on when the attribute is not there at all', () => {
    /* Absent is where the property's own default stands, and Lit does not call
       a converter for an attribute nobody wrote. Asserted anyway, because the
       function has to answer the same way if it is ever called directly. */
    expect(onUnlessFalse.fromAttribute?.(null, Boolean)).toBe(false)
  })

  test('is on when it is there and says nothing', () => {
    expect(onUnlessFalse.fromAttribute?.('', Boolean)).toBe(true)
  })

  test('and off for the one word a consumer would write', () => {
    expect(onUnlessFalse.fromAttribute?.('false', Boolean)).toBe(false)
  })

  test('anything else is on, rather than a vocabulary to guess at', () => {
    /* `"0"` and `"no"` are on. A converter that accepted them would invite a
       consumer to guess, and the guess they get wrong is the one that silently
       means the opposite of what they wanted. */
    expect(
      ['0', 'no', 'off', 'FALSE'].map((one) => onUnlessFalse.fromAttribute?.(one, Boolean)),
    ).toEqual([true, true, true, true])
  })

  test('writes back what it can read', () => {
    const round = (value: boolean) =>
      onUnlessFalse.fromAttribute?.(
        onUnlessFalse.toAttribute?.(value, Boolean) as string | null,
        Boolean,
      )
    expect([round(true), round(false)]).toEqual([true, false])
  })
})
