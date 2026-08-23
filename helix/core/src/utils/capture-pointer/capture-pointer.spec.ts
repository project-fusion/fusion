import { describe, expect, test } from 'bun:test'
import { capturePointer } from './capture-pointer.js'

/**
 * A drag that survives the platform refusing to hand over the pointer.
 *
 * **Stubbed rather than run against a real element, because the throw is the
 * subject.** `setPointerCapture` rejects a pointer id that names nothing
 * active, and there is no way to ask a browser for that state on purpose: a
 * synthetic `pointerdown` simply has no active pointer, which is how four
 * browser specs came to report uncaught page errors and three splitter specs
 * came to stub this method as though it were setup. Controlling the refusal is
 * the only way to assert that the drag continues past it.
 */
const target = (behaviour: 'takes' | 'refuses') => {
  const calls: number[] = []
  const element = {
    setPointerCapture(id: number) {
      calls.push(id)
      if (behaviour === 'refuses') {
        throw new DOMException('no active pointer', 'NotFoundError')
      }
    },
  } as unknown as Element
  return { calls, element }
}

describe('taking the pointer', () => {
  test('reports that it took, and asks for the id it was given', () => {
    const { calls, element } = target('takes')
    expect(capturePointer(element, 7)).toBe(true)
    expect(calls).toEqual([7])
  })
})

describe('a platform that refuses', () => {
  /* The whole reason this exists. Called bare, the throw took out the lines
     below it, which are the ones that set the dragging flag and call
     `preventDefault`, so a refusal cancelled the drag rather than degrading
     it. */
  test('does not throw, so the handler below the call still runs', () => {
    const { element } = target('refuses')
    let reached = false
    expect(() => {
      capturePointer(element, 7)
      reached = true
    }).not.toThrow()
    expect(reached).toBe(true)
  })

  test('and says so, for the callers that check before believing a move', () => {
    expect(capturePointer(target('refuses').element, 7)).toBe(false)
  })
})
