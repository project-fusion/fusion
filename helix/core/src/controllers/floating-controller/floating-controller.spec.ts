import { describe, expect, test } from 'bun:test'
import type { Placement as FloatingPlacement } from '@floating-ui/dom'
import { FloatingController, matchedInlineSize, type Placement } from './floating-controller.js'

/** A host standing in for a Lit element, which only has to collect controllers. */
const host = () => {
  const controllers: unknown[] = []
  return {
    addController: (controller: unknown) => controllers.push(controller),
    controllers,
    removeController: () => {},
    requestUpdate: () => {},
    updateComplete: Promise.resolve(true),
  } as unknown as ConstructorParameters<typeof FloatingController>[0] & {
    controllers: unknown[]
  }
}

describe('FloatingController', () => {
  test('registers itself with its host, so a disconnect releases the tracking', () => {
    const owner = host()
    const controller = new FloatingController(owner, {
      anchor: () => null,
      floating: () => null,
    })
    expect(owner.controllers).toContain(controller)
  })

  test('starting without both elements does nothing rather than throwing', () => {
    // An overlay is constructed before it is rendered, so the controller is
    // asked to start before either element exists.
    const controller = new FloatingController(host(), {
      anchor: () => null,
      floating: () => null,
    })
    expect(() => controller.start()).not.toThrow()
    expect(() => controller.update()).not.toThrow()
    expect(() => controller.stop()).not.toThrow()
  })

  test('stopping twice is safe', () => {
    const controller = new FloatingController(host(), {
      anchor: () => null,
      floating: () => null,
    })
    controller.stop()
    expect(() => controller.stop()).not.toThrow()
  })

  test('defaults to bottom-start before anything is measured', () => {
    const controller = new FloatingController(host(), {
      anchor: () => null,
      floating: () => null,
    })
    expect(controller.placement).toBe('bottom-start')
  })
})

/**
 * Our `Placement` and Floating UI's name the same twelve.
 *
 * **A type assertion, because that is what this claim is**, and specs are
 * typechecked, so it fails the build the day it stops holding. `Placement` is
 * written out here rather than re-exported from `@floating-ui/dom` so the twelve
 * reach the manifest as values a reader can see; the cost of writing them is a
 * second copy, and this is what keeps the two equal.
 *
 * Only one direction needs saying. Ours being a subset of theirs is already
 * enforced by use: this controller hands `placement` to `computePosition`, so a
 * word of ours they do not have fails there. This is the other way, theirs
 * gaining one we never listed, which nothing would otherwise notice.
 */
describe('the placements this controller takes', () => {
  test('are every one Floating UI has, so a widening there fails here', () => {
    /* Keyed by theirs and valued by ours, so one object holds both halves: a
       placement they gain has no key here, and a placement we drop has no value
       to write. A `true` on the right with a cast below would have let the
       second slip past, which it did until this was planted. */
    const EVERY: Record<FloatingPlacement, Placement> = {
      bottom: 'bottom',
      'bottom-end': 'bottom-end',
      'bottom-start': 'bottom-start',
      left: 'left',
      'left-end': 'left-end',
      'left-start': 'left-start',
      right: 'right',
      'right-end': 'right-end',
      'right-start': 'right-start',
      top: 'top',
      'top-end': 'top-end',
      'top-start': 'top-start',
    }
    expect(Object.keys(EVERY)).toHaveLength(12)
  })
})

describe('the width of a panel that matches its anchor', () => {
  test('is the width of the anchor wherever the panel has the room', () => {
    expect(matchedInlineSize(300.4, 792)).toBe(300)
  })

  test('is the room where the anchor is wider, so the list of a full-width trigger keeps the margins', () => {
    expect(matchedInlineSize(900, 884)).toBe(884)
  })

  test('is never below nothing, where the window leaves no room', () => {
    expect(matchedInlineSize(300, -20)).toBe(0)
  })
})
