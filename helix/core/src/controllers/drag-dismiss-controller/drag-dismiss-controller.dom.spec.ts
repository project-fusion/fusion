import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { SwipeEdge } from '../../utils/swipe/swipe.js'
import { DragDismissController, type DragDismissOptions } from './drag-dismiss-controller.js'

beforeAll(() => {
  registerDom()
})

const hosts: HTMLElement[] = []
const restores: Array<() => void> = []
afterEach(() => {
  for (const one of hosts.splice(0)) {
    one.remove()
  }
  for (const restore of restores.splice(0)) {
    restore()
  }
})

/* The frames, run by hand, and the clock they read, set by hand, so a glide
   can be sampled at exact times. */
let now = 0
const frames = new Map<number, () => void>()
let frameId = 0
const runFrame = (at: number): void => {
  now = at
  const due = [...frames.values()]
  frames.clear()
  for (const one of due) {
    one()
  }
}
const useFrames = (): void => {
  const raf = globalThis.requestAnimationFrame
  const caf = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = ((callback: () => void) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => {
    frames.delete(id)
  }) as typeof cancelAnimationFrame
  const clock = spyOn(performance, 'now').mockImplementation(() => now)
  restores.push(() => {
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = caf
    clock.mockRestore()
    frames.clear()
  })
}

/* An animation that only keeps time, on a linear curve, which is all the
   controller reads of one. */
const fakeAnimate = (element: HTMLElement): void => {
  ;(element as unknown as { animate: unknown }).animate = (
    _frames: unknown,
    options: { duration: number },
  ) => {
    let time = 0
    return {
      cancel: () => undefined,
      get currentTime() {
        return time
      },
      set currentTime(value: number) {
        time = value
      },
      effect: {
        getComputedTiming: () => ({ progress: Math.min(1, time / options.duration) }),
      },
      pause: () => undefined,
    }
  }
}

interface Setup {
  button: HTMLButtonElement
  controller: DragDismissController
  dismissed: number[]
  landed: boolean[]
  marks: boolean[]
  moved: number[]
  surface: HTMLElement
  update: () => void
}

/* A host that is a real element, so the pointer events reach it, holding a
   surface 300 pixels wide and 100 tall with a button inside. */
const setup = (
  overrides: Partial<DragDismissOptions> & { refuse?: boolean; duration?: string } = {},
): Setup => {
  const host = document.createElement('div') as unknown as HTMLElement & ReactiveControllerHost
  const surface = document.createElement('div')
  const button = document.createElement('button')
  surface.append(button)
  host.append(surface)
  document.body.append(host)
  hosts.push(host)
  surface.getBoundingClientRect = () =>
    ({ bottom: 400, height: 100, left: 600, right: 900, top: 300, width: 300 }) as DOMRect
  const controllers: ReactiveController[] = []
  ;(host as unknown as { addController: (one: ReactiveController) => void }).addController = (
    one,
  ) => {
    controllers.push(one)
  }
  const dismissed: number[] = []
  const landed: boolean[] = []
  const marks: boolean[] = []
  const moved: number[] = []
  const { refuse, duration, ...rest } = overrides
  const controller = new DragDismissController(host, {
    dismiss: () => {
      dismissed.push(1)
      return !refuse
    },
    edge: () => 'right' as SwipeEdge,
    landed: (one) => landed.push(one),
    mark: (on) => marks.push(on),
    moved: (travel) => moved.push(travel),
    surface: () => surface,
    timing: () => ({ duration: duration ?? '', easing: 'linear' }),
    ...rest,
  })
  for (const one of controllers) {
    one.hostConnected?.()
  }
  /* Disconnected after the test, so a drag left held stops listening on the window. */
  restores.push(() => {
    for (const one of controllers) {
      one.hostDisconnected?.()
    }
  })
  const update = (): void => {
    for (const one of controllers) {
      one.hostUpdated?.()
    }
  }
  update()
  return { button, controller, dismissed, landed, marks, moved, surface, update }
}

const pointer = (type: string, x: number, at: number, pointerType = 'touch'): PointerEvent => {
  const event = new PointerEvent(type, {
    bubbles: true,
    button: 0,
    clientX: x,
    clientY: 100,
    composed: true,
    pointerId: 1,
    pointerType,
  })
  Object.defineProperty(event, 'timeStamp', { value: at })
  return event
}

/* A drag from x 100 through `path`, a list of [x, time], released at the last. */
const drag = (surface: HTMLElement, path: Array<[number, number]>, release = true): void => {
  surface.dispatchEvent(pointer('pointerdown', 100, 0))
  for (const [x, at] of path) {
    window.dispatchEvent(pointer('pointermove', x, at))
  }
  const [x, at] = path[path.length - 1] ?? [100, 0]
  if (release) {
    window.dispatchEvent(pointer('pointerup', x, at))
  }
}

const translateX = (element: HTMLElement): number =>
  Number.parseFloat(element.style.translate.split(' ')[0] ?? '') || 0

describe('a drag', () => {
  test('moves the surface with the finger, one to one, and says it is dragging', () => {
    const { marks, surface } = setup()
    drag(
      surface,
      [
        [120, 100],
        [160, 200],
      ],
      false,
    )
    expect(surface.style.translate).toBe('60px 0px')
    expect(marks).toEqual([true])
  })

  test('marks the surface with its axis while it can be dragged', () => {
    let open = true
    const { surface, update } = setup({ edge: () => (open ? 'bottom' : undefined) })
    expect(surface.getAttribute('data-drags')).toBe('y')
    open = false
    update()
    expect(surface.hasAttribute('data-drags')).toBe(false)
  })

  test('meets resistance past the open end, and moves less the further it goes', () => {
    const { surface } = setup()
    drag(surface, [[40, 100]], false)
    const near = translateX(surface)
    window.dispatchEvent(pointer('pointermove', -200, 200))
    const far = translateX(surface)
    expect(near).toBeLessThan(0)
    expect(near).toBeGreaterThan(-60)
    expect(far).toBeLessThan(near)
    expect(far).toBeGreaterThan(-300)
  })

  test('meets resistance past `bounds`, for a host that will not go', () => {
    const { surface } = setup({ bounds: () => ({ max: 0, min: 0 }) })
    drag(surface, [[300, 100]], false)
    expect(translateX(surface)).toBeGreaterThan(0)
    expect(translateX(surface)).toBeLessThan(100)
  })

  test('a press that does not travel is a press, and the button inside still clicks', () => {
    const { button, marks, surface } = setup()
    let clicked = 0
    button.addEventListener('click', () => {
      clicked += 1
    })
    button.dispatchEvent(pointer('pointerdown', 100, 0))
    window.dispatchEvent(pointer('pointermove', 103, 50))
    window.dispatchEvent(pointer('pointerup', 103, 60))
    button.click()
    expect(clicked).toBe(1)
    expect(marks).toEqual([])
    expect(surface.style.translate).toBe('')
  })
})

describe('the release', () => {
  test('a slow, short drag goes back', () => {
    const { dismissed, landed, marks, surface } = setup()
    drag(surface, [
      [120, 100],
      [160, 400],
      [160, 600],
    ])
    expect(dismissed).toEqual([])
    expect(landed).toEqual([false])
    expect(surface.style.translate).toBe('')
    expect(marks).toEqual([true, false])
  })

  test('a fast flick dismisses from a short distance', () => {
    const { dismissed, landed, surface } = setup()
    // 50 pixels of a 300 pixel surface, at 1.7 pixels a millisecond.
    drag(surface, [
      [115, 10],
      [130, 20],
      [150, 30],
    ])
    expect(dismissed).toEqual([1])
    expect(landed).toEqual([true])
  })

  test('a long, slow drag dismisses', () => {
    const { dismissed, landed, surface } = setup()
    // 170 pixels, past half the surface, and still for 300 milliseconds before the lift.
    drag(surface, [
      [140, 300],
      [220, 600],
      [270, 900],
      [270, 1200],
    ])
    expect(dismissed).toEqual([1])
    expect(landed).toEqual([true])
  })

  test('a fling away from the edge goes back, however far it was dragged', () => {
    const { dismissed, surface } = setup()
    drag(surface, [
      [300, 100],
      [280, 110],
      [260, 120],
    ])
    expect(dismissed).toEqual([])
  })

  test('a dismissal the host refuses goes back', () => {
    const { dismissed, landed, surface } = setup({ refuse: true })
    drag(surface, [
      [200, 100],
      [300, 200],
    ])
    expect(dismissed).toEqual([1])
    expect(landed).toEqual([false])
    expect(surface.style.translate).toBe('')
  })

  test('a host that rests elsewhere decides, and the surface moves by the difference', () => {
    let rest = 0
    const { dismissed, surface } = setup({
      decide: () => {
        rest = 150
        return false
      },
      rest: () => rest,
    })
    drag(surface, [[160, 100]], false)
    expect(surface.style.translate).toBe('60px 0px')
    window.dispatchEvent(pointer('pointerup', 160, 1000))
    expect(dismissed).toEqual([])
    expect(surface.style.translate).toBe('')
  })

  test('a cancel goes back and lets go of the pointer', () => {
    const { dismissed, landed, surface } = setup()
    let captured: number | undefined
    surface.setPointerCapture = (id: number) => {
      captured = id
    }
    surface.hasPointerCapture = (id: number) => captured === id
    surface.releasePointerCapture = () => {
      captured = undefined
    }
    drag(surface, [[260, 100]], false)
    expect(captured).toBe(1)
    window.dispatchEvent(pointer('pointercancel', 260, 120))
    expect(captured).toBeUndefined()
    expect(dismissed).toEqual([])
    expect(landed).toEqual([false])
    expect(surface.style.translate).toBe('')
  })

  test('toward the left edge, as a toast at the end of a right-to-left line goes', () => {
    const { dismissed, surface } = setup({ edge: () => 'left' })
    drag(surface, [
      [80, 10],
      [60, 20],
      [40, 30],
    ])
    expect(dismissed).toEqual([1])
  })
})

describe('the glide after the release', () => {
  test('leaves at the speed it was let go, and lands off the window', () => {
    useFrames()
    const { landed, marks, moved, surface } = setup({ duration: '320ms' })
    fakeAnimate(surface)
    now = 1000
    // 90 pixels in 60 milliseconds: 1.5 pixels a millisecond.
    drag(surface, [
      [130, 20],
      [160, 40],
      [190, 60],
    ])
    expect(landed).toEqual([])
    expect(translateX(surface)).toBe(90)
    runFrame(1016)
    const first = translateX(surface)
    runFrame(1032)
    const second = translateX(surface)
    // No stall and no jump: 16 milliseconds at 1.5 is 24 pixels.
    expect(first).toBeCloseTo(90 + 24, 0)
    expect(second - first).toBeCloseTo(24, 0)
    for (let at = 1048; at < 1600 && landed.length === 0; at += 16) {
      runFrame(at)
    }
    expect(landed).toEqual([true])
    // The window is 1024 wide in happy-dom and the surface starts at 600.
    expect(moved[moved.length - 1]).toBeCloseTo(90 + window.innerWidth - 600, 0)
    expect(marks).toEqual([true, false])
    // It keeps where it left until it can be dragged again.
    expect(surface.style.translate).not.toBe('')
  })

  test('goes back along the curve, with the speed it was let go carried in', () => {
    useFrames()
    const { dismissed, landed, surface } = setup({ duration: '300ms' })
    fakeAnimate(surface)
    now = 1000
    // 0.3 pixels a millisecond toward the edge, short of halfway.
    drag(surface, [
      [130, 50],
      [145, 100],
      [160, 150],
    ])
    expect(dismissed).toEqual([])
    expect(translateX(surface)).toBe(60)
    runFrame(1010)
    /* The curve brings it back two pixels in ten milliseconds, and the push
       carries it on nearly three: it is still moving toward the edge. */
    expect(translateX(surface)).toBeGreaterThan(60)
    for (let at = 1020; at < 1400 && landed.length === 0; at += 10) {
      runFrame(at)
    }
    expect(landed).toEqual([false])
    expect(surface.style.translate).toBe('')
  })

  test('a drag caught on its way back carries on from where it is', () => {
    useFrames()
    const { landed, surface } = setup({ duration: '300ms' })
    fakeAnimate(surface)
    now = 1000
    drag(surface, [
      [140, 100],
      [180, 400],
      [180, 600],
    ])
    runFrame(1100)
    const caught = translateX(surface)
    expect(caught).toBeGreaterThan(0)
    expect(caught).toBeLessThan(80)
    surface.dispatchEvent(pointer('pointerdown', 300, 2000))
    window.dispatchEvent(pointer('pointermove', 320, 2100))
    expect(translateX(surface)).toBeCloseTo(caught, 0)
    window.dispatchEvent(pointer('pointermove', 330, 2200))
    expect(translateX(surface)).toBeCloseTo(caught + 10, 0)
    expect(landed).toEqual([])
  })

  test('under reduced motion it goes at once, and the drag still follows the finger', () => {
    useFrames()
    const media = globalThis.matchMedia
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof matchMedia
    restores.push(() => {
      globalThis.matchMedia = media
    })
    const { landed, surface } = setup({ duration: '320ms' })
    fakeAnimate(surface)
    drag(
      surface,
      [
        [130, 10],
        [160, 30],
      ],
      false,
    )
    expect(surface.style.translate).toBe('60px 0px')
    window.dispatchEvent(pointer('pointerup', 190, 50))
    expect(landed).toEqual([true])
    expect(frames.size).toBe(0)
  })
})
