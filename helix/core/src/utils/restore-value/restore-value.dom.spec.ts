import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { holdCaret, restoreValue } from './restore-value.js'

/**
 * Keeping the caret where the reader left it across a write they did not make.
 *
 * **The platform behavior this exists for is real here.** Assigning a
 * different string to a text control moves the caret to the end, and happy-dom
 * does it too: measured, caret at 3 in `abcdef`, assign `abcXdef`, caret at 7.
 * So these specs exercise the actual failure rather than a description of it.
 *
 * The case it exists for: a React consumer holding the value in state commits
 * after the event, so a controlled field is put back to the old text while they
 * decide, Lit then assigns a genuinely different string, and without this the
 * caret goes to the end after every single keystroke, making it impossible to
 * type in the middle of a word.
 */
beforeAll(() => {
  registerDom()
})

const field = (value: string, at: number, to = at): HTMLInputElement => {
  const made = document.createElement('input')
  made.value = value
  document.body.append(made)
  made.setSelectionRange(at, to)
  return made
}

describe('putting a value back', () => {
  test('writes it', () => {
    const control = field('typed', 5)
    restoreValue(control, 'theirs')
    expect(control.value).toBe('theirs')
  })

  /* One character wide is the common case: the reader typed, the element
     restored the shorter previous string, and the caret belongs one place back.
     Clamping alone would leave it one to the right of where they were, which is
     the same bug at a smaller size. */
  test('and moves the caret by however much the text shrank', () => {
    const control = field('abcXdef', 4)
    restoreValue(control, 'abcdef')
    expect(control.selectionStart).toBe(3)
  })

  test('or grew', () => {
    const control = field('abcdef', 3)
    restoreValue(control, 'abcXdef')
    expect(control.selectionStart).toBe(4)
  })

  test('keeping a selection’s two ends and the direction it was made in', () => {
    const control = field('abcdef', 2, 4)
    control.setSelectionRange(2, 4, 'backward')
    restoreValue(control, 'Xabcdef')
    expect([control.selectionStart, control.selectionEnd, control.selectionDirection]).toEqual([
      3,
      5,
      'backward',
    ])
  })

  /* The lower clamp is the half that fires: a caret near the start of text that
     is being replaced by something much shorter maps to a negative offset. The
     upper one cannot, and it is worth saying so rather than writing a test that
     appears to cover it. `delta` is `next.length - value.length`, so
     `point + delta > next.length` reduces to `point > value.length`, and a
     caret is never past the end of its own text. It stays as a guard on
     arithmetic somebody may later change. */
  test('and never before the start, however much shorter the new text is', () => {
    const control = field('abcdef', 1)
    restoreValue(control, 'xy')
    expect(control.selectionStart).toBe(0)
  })

  test('landing on the new end where that is where the reader was', () => {
    const control = field('abcdef', 6)
    restoreValue(control, 'ab')
    expect(control.selectionStart).toBe(2)
  })
})

describe('a value that is already what it should be', () => {
  /* The assignment itself is what moves the caret, so the early return is
     behavior rather than an optimization. */
  test('is left alone, caret included', () => {
    const control = field('same', 2)
    restoreValue(control, 'same')
    expect([control.value, control.selectionStart]).toEqual(['same', 2])
  })
})

describe('a control with no selection to speak of', () => {
  /* `<input type="range">` reports `selectionStart` as null and *throws*
     `InvalidStateError` from `setSelectionRange`. The slider restores through
     this same util, which is what makes the guard load-bearing rather than
     defensive. Measured: happy-dom throws it too. */
  test('takes the value and is not asked about its caret', () => {
    const control = document.createElement('input')
    control.type = 'range'
    control.value = '10'
    expect(() => {
      restoreValue(control, '20')
    }).not.toThrow()
    expect(control.value).toBe('20')
  })
})

describe('holding the caret across an update somebody else makes', () => {
  test('puts it back where it was when the text did not move', () => {
    const control = field('Ada Lovelace', 3)
    const put = holdCaret(control)
    control.value = 'Ada Lovelace'
    put()
    expect(control.selectionStart).toBe(3)
  })

  /* The asymmetry `holdCaret` exists for: Lit's `.value` binding assigns a
     genuinely different string on a controlled field, the platform resets the
     selection, and this maps it by however much the text grew. */
  test('and maps it by the difference when it did', () => {
    const control = field('AdaX Lovelace', 4)
    const put = holdCaret(control)
    control.value = 'Ada Lovelace'
    expect(control.selectionStart).toBe(12)
    put()
    expect(control.selectionStart).toBe(3)
  })

  test('and asks nothing of a control that has no selection', () => {
    const control = document.createElement('input')
    control.type = 'range'
    control.value = '10'
    const put = holdCaret(control)
    control.value = '20'
    expect(() => {
      put()
    }).not.toThrow()
  })
})
