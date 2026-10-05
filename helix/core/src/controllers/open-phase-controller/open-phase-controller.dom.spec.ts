import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { animationsSettled, type OpenPhase, OpenPhaseController } from './open-phase-controller.js'

beforeAll(() => {
  registerDom()
})

/* A host with nothing but the hook the controller needs, driven by hand. */
const setup = (surface: Element | null = null) => {
  let open = false
  const marks = new Set<OpenPhase>()
  let controller: ReactiveController | undefined
  const host = {
    addController: (one: ReactiveController) => {
      controller = one
    },
  } as unknown as ReactiveControllerHost
  new OpenPhaseController(host, {
    mark: {
      entering: (on) => (on ? marks.add('entering') : marks.delete('entering')),
      exiting: (on) => (on ? marks.add('exiting') : marks.delete('exiting')),
    },
    open: () => open,
    surface: () => surface,
  })
  const update = (next: boolean): void => {
    open = next
    controller?.hostUpdated?.()
  }
  return { marks, update }
}

const later = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 80))

/* Polls to the outcome rather than sleeping at it: two frames on a loaded
   runner can take longer than any fixed wait worth writing down. */
const settles = async (marks: Set<OpenPhase>): Promise<void> => {
  const until = Date.now() + 1500
  while (marks.size > 0 && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('entering and exiting', () => {
  test('the first update marks nothing, open or not', () => {
    const { marks, update } = setup()
    update(true)
    expect([...marks]).toEqual([])
  })

  test('opening is entering until the surface settles, and closing is exiting', async () => {
    const { marks, update } = setup()
    update(false)
    update(true)
    expect([...marks]).toEqual(['entering'])
    await settles(marks)
    expect([...marks]).toEqual([])
    update(false)
    expect([...marks]).toEqual(['exiting'])
    await settles(marks)
    expect([...marks]).toEqual([])
  })

  test('a close during the entrance is not cleared by the entrance settling', async () => {
    const { marks, update } = setup()
    update(false)
    update(true)
    update(false)
    expect([...marks]).toEqual(['exiting'])
    await settles(marks)
    expect([...marks]).toEqual([])
  })

  test('an update that leaves open where it was starts nothing', () => {
    const { marks, update } = setup()
    update(false)
    update(false)
    expect([...marks]).toEqual([])
  })
})

describe('animationsSettled', () => {
  test('waits for every animation on the element, the ones under it included', async () => {
    let finish = (): void => {}
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    const element = document.createElement('div')
    let asked: GetAnimationsOptions | undefined
    element.getAnimations = ((options?: GetAnimationsOptions) => {
      asked = options
      return [{ finished } as unknown as Animation]
    }) as Element['getAnimations']
    let done = false
    void animationsSettled(element).then(() => {
      done = true
    })
    await later()
    expect(done).toBe(false)
    expect(asked).toEqual({ subtree: true })
    finish()
    await later()
    expect(done).toBe(true)
  })

  test('resolves where there is no element to ask', async () => {
    await animationsSettled(null)
    expect(true).toBe(true)
  })
})
