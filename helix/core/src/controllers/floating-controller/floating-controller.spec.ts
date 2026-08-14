import { describe, expect, test } from 'bun:test'
import { FloatingController } from './floating-controller.js'

/** A host standing in for a Lit element, which only has to collect controllers. */
const host = () => {
  const controllers: unknown[] = []
  return {
    addController: (controller: unknown) => controllers.push(controller),
    controllers,
    removeController: () => {},
    requestUpdate: () => {},
    updateComplete: Promise.resolve(true),
  } as unknown as Parameters<typeof FloatingController.prototype.constructor>[0] & {
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
