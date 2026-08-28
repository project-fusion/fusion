import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { anchorElement } from './anchor-element.js'

/**
 * Finding the thing a floating surface should open against.
 *
 * A tooltip wraps what it describes, and a wrapper laying out as
 * `display: contents` has no box: measured, the host reports `0 0 0 0` while
 * the button inside it reports 32 by 32. Anchoring to the host opens the
 * surface against the top left of the window, so an icon button used as a
 * trigger is the one button on a toolbar that cannot have a tooltip.
 *
 * **`getClientRects` is stubbed, because happy-dom answers 1 for everything,
 * including a `display: contents` element.** It has no layout, so box-lessness
 * is not something it can be arranged into: it is the input to the decision,
 * and the only way to control an input a DOM cannot produce is to supply it.
 */
beforeAll(() => {
  registerDom()
})

/** A tree of nested elements, each declared as drawing a box or not. */
const chain = (...boxes: boolean[]): { deepest: HTMLElement; slot: HTMLSlotElement } => {
  const host = document.createElement('div')
  const slot = document.createElement('slot')
  host.append(slot)
  let node = host
  let deepest = host
  for (const draws of boxes) {
    const made = document.createElement('div')
    made.getClientRects = (() => (draws ? [{}] : [])) as unknown as typeof made.getClientRects
    node.append(made)
    node = made
    deepest = made
  }
  const first = host.querySelector('div')
  slot.assignedElements = (() => (first ? [first] : [])) as never
  return { deepest, slot }
}

const fallback = (): HTMLElement => document.createElement('main')

describe('a slot with something in it', () => {
  test('anchors to the assigned element when it draws a box', () => {
    const { slot } = chain(true)
    expect(anchorElement(slot, fallback()).tagName).toBe('DIV')
  })

  test('and descends past a wrapper that draws nothing', () => {
    const { deepest, slot } = chain(false, true)
    expect(anchorElement(slot, fallback())).toBe(deepest)
  })

  test('past as many as it has to', () => {
    const { deepest, slot } = chain(false, false, true)
    expect(anchorElement(slot, fallback())).toBe(deepest)
  })

  /* An element with no children is the anchor whatever it reports, because
     there is nothing further down to prefer. A leaf that draws nothing is a
     component with nothing on the screen, which anchoring cannot fix. */
  test('and stops at a leaf, having nowhere further to go', () => {
    const { deepest, slot } = chain(false)
    expect(anchorElement(slot, fallback())).toBe(deepest)
  })

  /* Bounded rather than a walk to the leaves. A chain of box-less wrappers is
     already unusual, and descending without a limit through a tree this library
     does not own is worse than stopping and anchoring to something imperfect. */
  test('giving up after four, rather than walking a tree it does not own', () => {
    const { deepest, slot } = chain(false, false, false, false, false, true)
    expect(anchorElement(slot, fallback())).not.toBe(deepest)
  })
})

describe('a slot with nothing in it', () => {
  test('anchors to the fallback, which is the component itself', () => {
    const empty = document.createElement('slot')
    empty.assignedElements = (() => []) as never
    const given = fallback()
    expect(anchorElement(empty, given)).toBe(given)
  })

  test('and so does no slot at all, which is what a server render has', () => {
    const given = fallback()
    expect(anchorElement(null, given)).toBe(given)
    expect(anchorElement(undefined, given)).toBe(given)
  })
})
