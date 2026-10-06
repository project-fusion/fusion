import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Map = HTMLElement & {
  idleDelay: number
  label: string
  panStep: number
  updateComplete: Promise<boolean>
}

const map = async (extra = ''): Promise<Map> =>
  (await mount(
    `<helix-headless-map label="Edinburgh" ${extra}>
      <canvas></canvas>
      <span slot="attribution">© OpenStreetMap contributors</span>
    </helix-headless-map>`,
  )) as Map

/** A part inside the frame, by its exact name in the `part` list. */
const control = (host: Map, name: string): HTMLElement | null =>
  (host.shadowRoot?.querySelector(`[part~="${name}"]`) as HTMLElement) ?? null

describe('map frame, gestures', () => {
  type Gestured = Map & { gestureMode: string; gestures: string }

  const hint = (host: Map): string => {
    const shown = control(host, 'gesture-hint')
    return shown && !shown.hidden ? (shown.textContent ?? '') : ''
  }
  /* The modifier set on the event itself as well, which happy-dom's
     constructor leaves out and a browser's does not. */
  const wheel = (host: Map, init: WheelEventInit = {}): void => {
    const event = new WheelEvent('wheel', { bubbles: true, deltaY: 40, ...init })
    Object.defineProperty(event, 'ctrlKey', { value: init.ctrlKey === true })
    host.querySelector('canvas')?.dispatchEvent(event)
  }
  const press = (target: Element, type = 'pointerdown', pointerType = 'mouse'): void => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerType }))
  }

  test('by default the renderer takes every gesture and the frame says nothing', async () => {
    const host = (await map()) as Gestured
    expect(host.gestures).toBeUndefined()
    expect(host.gestureMode).toBe('free')
    wheel(host)
    await host.updateComplete
    expect(hint(host)).toBe('')
  })

  test('cooperative: a plain wheel and one finger are the page’s, and the frame says how to reach the map', async () => {
    const host = (await map('gestures="cooperative"')) as Gestured
    const told: string[] = []
    host.addEventListener('helix-map-part-change', (event) =>
      told.push((event as CustomEvent).detail.kind),
    )
    expect(host.gestureMode).toBe('cooperative')
    /* Ctrl or ⌘ with the wheel is the map's, a trackpad's pinch among them. */
    wheel(host, { ctrlKey: true })
    await host.updateComplete
    expect(hint(host)).toBe('')
    wheel(host)
    await host.updateComplete
    expect(hint(host)).toMatch(/^Use (Ctrl|⌘) and scroll to zoom the map$/)
    const canvas = host.querySelector('canvas') as HTMLCanvasElement
    const touch = new TouchEvent('touchmove', { bubbles: true })
    Object.defineProperty(touch, 'touches', { value: [{}] })
    canvas.dispatchEvent(touch)
    await host.updateComplete
    expect(hint(host)).toBe('Use two fingers to move the map')
    host.gestures = 'always'
    await host.updateComplete
    expect(told).toContain('gestures')
  })

  test('activate: nothing until the map is pressed, and given back on Escape, on leaving, or on a press elsewhere', async () => {
    const host = (await map('gestures="activate"')) as Gestured
    const canvas = host.querySelector('canvas') as HTMLCanvasElement
    const region = control(host, 'region') as HTMLElement
    expect(host.gestureMode).toBe('off')
    wheel(host)
    await host.updateComplete
    expect(hint(host)).toBe('Press the map to use it')

    press(canvas)
    await host.updateComplete
    expect(host.gestureMode).toBe('free')
    expect(hasState(host, 'using')).toBe(true)
    expect(control(host, 'gesture-status')?.hidden).toBe(false)

    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await host.updateComplete
    expect(host.gestureMode).toBe('off')

    press(canvas)
    await host.updateComplete
    /* A finger lifting is a `pointerleave`, and a tap is not a release. */
    press(region, 'pointerleave', 'touch')
    await host.updateComplete
    expect(host.gestureMode).toBe('free')
    press(region, 'pointerleave', 'mouse')
    await host.updateComplete
    expect(host.gestureMode).toBe('off')

    press(canvas)
    await host.updateComplete
    press(document.body)
    await host.updateComplete
    expect(host.gestureMode).toBe('off')
    expect(hasState(host, 'using')).toBe(false)
  })
})

describe('map frame, drawn', () => {
  test('says it once each time the map is drawn whole, in an event, a state and `ready`', async () => {
    const host = (await map()) as Awaited<ReturnType<typeof map>> & {
      drawn(whole?: boolean): void
      ready: boolean
    }
    let heard = 0
    host.addEventListener('helix-map-ready', () => {
      heard += 1
    })
    expect([host.ready, hasState(host, 'ready')]).toEqual([false, false])
    host.drawn()
    host.drawn()
    expect([heard, host.ready, hasState(host, 'ready')]).toEqual([1, true, true])
    /* Taken away, as a renderer that disconnects does, which says nothing. */
    host.drawn(false)
    expect([heard, host.ready, hasState(host, 'ready')]).toEqual([1, false, false])
    host.drawn()
    expect(heard).toBe(2)
  })
})

describe('map frame', () => {
  test('the region carries the name, which is the whole argument for the family', async () => {
    /* Measured before this was written: a canvas slotted the ordinary way has no
       node at all in the accessibility tree. A named region is the difference
       between a map a screen reader never meets and one it announces. */
    const host = await map()
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Edinburgh')
    expect(part(host, 'region')?.getAttribute('role')).toBe('group')
  })

  test('the controls are buttons, so every screen reader can find them', async () => {
    // Not arrow keys alone: what a screen reader does with arrows is not ours to
    // decide, and a button needs no bargain about reading mode.
    const host = await map('controls="pan zoom fullscreen"')
    for (const name of ['pan-up', 'pan-down', 'pan-start', 'pan-end', 'zoom-in', 'zoom-out']) {
      const button = control(host, name)
      expect(button?.tagName.toLowerCase()).toBe('button')
      expect(button?.getAttribute('aria-label')).toBeTruthy()
    }
  })

  test('a press asks rather than moves, and says which way and how far', async () => {
    const host = await map('controls="pan zoom fullscreen"')
    const asked: Array<{ by: number; to: string }> = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ by: number; to: string }>).detail)
    })
    control(host, 'pan-up')?.click()
    control(host, 'pan-end')?.click()
    expect(asked).toEqual([
      { by: 0.25, to: 'up' },
      { by: 0.25, to: 'end' },
    ])
  })

  test('zoom is a direction rather than a level', async () => {
    /* A scale is the consumer's: Leaflet, MapLibre and a static tile server do
       not agree on what zoom 14 is, so a frame naming one would be asserting a
       numbering it cannot know. */
    const host = await map()
    const asked: number[] = []
    host.addEventListener('helix-map-zoom', (event) => {
      asked.push((event as CustomEvent<{ by: number }>).detail.by)
    })
    control(host, 'zoom-in')?.click()
    control(host, 'zoom-out')?.click()
    expect(asked).toEqual([1, -1])
  })

  test('the step is a fraction of the viewport, and a consumer can change it', async () => {
    const host = await map('controls="pan" pan-step="0.5"')
    const asked: number[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ by: number }>).detail.by)
    })
    control(host, 'pan-down')?.click()
    expect(asked).toEqual([0.5])
  })

  test('the arrow keys ask for the same thing the buttons do', async () => {
    const host = await map()
    const asked: string[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const region = part(host, 'region') as HTMLElement
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      region.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
    }
    expect(asked).toEqual(['up', 'down', 'start', 'end'])
  })

  test('the chrome may hide, and the controls never do', async () => {
    /* A reader who has gone still has not stopped needing the only controls this
       frame offers. */
    const host = await map('idle-delay="10"')
    await new Promise((resolve) => setTimeout(resolve, 30))
    await host.updateComplete
    expect(hasState(host, 'idle')).toBe(true)
    expect(control(host, 'zoom-in')).not.toBeNull()
  })

  test('the wait is off by default, because the controls are how it is operated', async () => {
    const host = await map()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(hasState(host, 'idle')).toBe(false)
  })

  test('the attribution is slotted and nothing takes it away', async () => {
    // Most tile licenses require the credit to be visible.
    const host = await map()
    expect(host.querySelector('[slot="attribution"]')?.textContent).toContain('OpenStreetMap')
    expect(host.shadowRoot?.querySelector('slot[name="attribution"]')).not.toBeNull()
  })
})

/**
 * Which controls this frame draws, which is a list rather than a switch.
 *
 * **The overlap with a consumer's map is not symmetric.** Every map library
 * draws zoom controls and none draws pan buttons, so a single switch would make
 * a MapLibre consumer choose between two zoom controls and no pan pad.
 */
describe('map controls a consumer keeps or drops', () => {
  test('zoom, the compass, and fullscreen by default, and pan where a page asks', async () => {
    const host = await map()
    for (const name of ['zoom-in', 'face-north', 'fullscreen']) {
      expect(control(host, name)).not.toBeNull()
    }
    expect(control(host, 'pan-up')).toBeNull()
    expect(control(await map('controls="pan"'), 'pan-up')).not.toBeNull()
  })

  test('the pan pad without the zoom, which is the MapLibre case', async () => {
    const host = await map('controls="pan fullscreen"')
    expect(control(host, 'pan-up')).not.toBeNull()
    expect(control(host, 'zoom-in')).toBeNull()
    expect(control(host, 'zoom-out')).toBeNull()
    expect(control(host, 'fullscreen')).not.toBeNull()
  })

  test('none at all, for a map that already has controls a reader can find', async () => {
    /* What this family argues for is that *a* findable control exists, never
       that it is ours, so a consumer whose map is already operable should be
       able to keep the frame and drop the buttons. */
    const host = await map('controls="none"')
    expect(control(host, 'controls')).toBeNull()
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Edinburgh')
  })

  test('the methods stay public when the buttons are gone', async () => {
    // A consumer drawing their own chrome still drives the frame.
    const host = (await map('controls="none"')) as Map & { pan(to: string): void }
    const asked: string[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    host.pan('up')
    expect(asked).toEqual(['up'])
  })

  test('the corner is the attribute’s absence at rest, and written when asked', async () => {
    const resting = await map()
    expect(resting.hasAttribute('controls-placement')).toBe(false)

    const placed = await map('controls-placement="bottom-start"')
    expect(placed.getAttribute('controls-placement')).toBe('bottom-start')
  })
})

/**
 * Whose keys these are, which is the question a slotted map makes sharp.
 */
describe('map keys', () => {
  test('the region is a tab stop, so the keys are reachable with no controls', async () => {
    /* The listener is on the region. Without a stop of its own, a frame at
       `controls="none"` around a map with nothing focusable had arrow keys no
       reader could press. */
    const host = await map('controls="none"')
    const region = part(host, 'region') as HTMLElement
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.getAttribute('aria-keyshortcuts')).toContain('ArrowUp')
  })

  test('a press that started in the slotted map is the map’s, not ours', async () => {
    /* MapLibre and Leaflet both answer the arrow keys themselves, so relaying a
       press that came from inside one moves the consumer's map twice. */
    const host = await map()
    const asked: string[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const slotted = host.querySelector('canvas') as HTMLElement
    slotted.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'ArrowUp' }),
    )
    expect(asked).toEqual([])
  })

  test('and a press on the frame itself still asks', async () => {
    const host = await map()
    const asked: string[] = []
    host.addEventListener('helix-map-pan', (event) => {
      asked.push((event as CustomEvent<{ to: string }>).detail.to)
    })
    const region = part(host, 'region') as HTMLElement
    region.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }))
    expect(asked).toEqual(['up'])
  })
})

describe('map controls on a right-to-left page', () => {
  test('the start control says and points the way it sits, which is right', async () => {
    /* The pad is laid out in reading order, so on a right-to-left page the
       start control is on the right: it said "left" and pointed left from there. */
    const host = await map('controls="pan" dir="rtl"')
    const start = control(host, 'pan-start')
    expect(start?.getAttribute('aria-label')).toBe('Pan right')
    expect(start?.textContent?.trim()).toBe('→')
    const ltr = await map('controls="pan"')
    expect(control(ltr, 'pan-start')?.getAttribute('aria-label')).toBe('Pan left')
  })

  test('rotate and tilt are drawn only where controls name them, and ask for a turn and a tilt', async () => {
    const plain = await map()
    expect(control(plain, 'rotate-left')).toBeNull()
    expect(control(plain, 'tilt')).toBeNull()

    const host = await map('controls="pan zoom rotate tilt fullscreen"')
    const asked: string[] = []
    host.addEventListener('helix-map-rotate', (event) =>
      asked.push(`rotate ${JSON.stringify(event.detail)}`),
    )
    host.addEventListener('helix-map-tilt', (event) =>
      asked.push(`tilt ${JSON.stringify(event.detail)}`),
    )
    control(host, 'rotate-left')?.click()
    control(host, 'rotate-right')?.click()
    control(host, 'face-north')?.click()
    const tilt = control(host, 'tilt')
    expect(tilt?.getAttribute('aria-pressed')).toBe('false')
    tilt?.click()
    ;(host as Map & { pitch: number }).pitch = 50
    await host.updateComplete
    expect(tilt?.getAttribute('aria-pressed')).toBe('true')
    tilt?.click()
    expect(control(host, 'flatten')).toBeNull()
    expect(asked).toEqual([
      'rotate {"by":-15}',
      'rotate {"by":15}',
      'rotate {"to":0}',
      'tilt {"to":50}',
      'tilt {"to":0}',
    ])
    expect(control(host, 'face-north')?.getAttribute('aria-label')).toBe('Face north')
  })

  test('the controls are one column in reading order, the arrows round a compass', async () => {
    const plain = await map('controls="pan"')
    const inCompass = (host: Map): string[] =>
      [...(control(host, 'compass')?.children ?? [])].map((one) => one.getAttribute('part') ?? '')
    expect(inCompass(plain)).toEqual(['pan-up', 'pan-start', 'face-north', 'pan-end', 'pan-down'])
    expect(control(plain, 'face-north')?.getAttribute('aria-label')).toBe('Face north')

    const host = await map('controls="pan zoom rotate tilt fullscreen"')
    const column = [...(control(host, 'controls')?.children ?? [])].map(
      (one) => one.getAttribute('part') ?? '',
    )
    expect(column).toEqual(['fullscreen', 'tilt', 'zoom-in', 'zoom-out', 'compass'])
    expect(inCompass(host)).toEqual([
      'rotate-left',
      'pan-up',
      'rotate-right',
      'pan-start',
      'face-north',
      'pan-end',
      'pan-down',
    ])
    expect(control(await map('controls="zoom"'), 'compass')).toBeNull()
    expect(inCompass(await map())).toEqual(['face-north'])
  })

  test('shift with the arrow keys rotates and tilts, and the region says so', async () => {
    const host = await map('controls="pan zoom rotate tilt"')
    const asked: string[] = []
    host.addEventListener('helix-map-rotate', (event) => asked.push(`rotate ${event.detail.by}`))
    host.addEventListener('helix-map-tilt', (event) => asked.push(`tilt ${event.detail.by}`))
    host.addEventListener('helix-map-pan', () => asked.push('pan'))
    const region = part(host, 'region') as HTMLElement
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      region.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, shiftKey: true }))
    }
    expect(asked).toEqual(['rotate -15', 'rotate 15', 'tilt 10', 'tilt -10'])
    expect(region.getAttribute('aria-keyshortcuts')).toContain('Shift+ArrowLeft')
    expect(region.getAttribute('aria-keyshortcuts')).toContain('Shift+ArrowUp')
  })

  test('the Face north needle turns against the bearing', async () => {
    const host = (await map('controls="rotate"')) as Map & { bearing: number }
    host.bearing = 90
    await host.updateComplete
    expect(control(host, 'face-north')?.getAttribute('style')).toContain(
      '--map-needle-turn: -90deg',
    )
  })
})

describe('map frame, states', () => {
  test('says it is turned, tilted and has its layers open as custom states', async () => {
    const host = (await map('controls="layers"')) as Map & { bearing: number; pitch: number }
    host.append(
      Object.assign(document.createElement('helix-headless-map-route'), { label: 'Route' }),
    )
    await host.updateComplete
    const states = (): string[] =>
      ['layers-open', 'rotated', 'tilted'].filter((name) => hasState(host, name))
    expect(states()).toEqual([])
    host.bearing = 359.8
    host.pitch = 0.2
    await host.updateComplete
    expect(states()).toEqual([])
    host.bearing = 90
    host.pitch = 45
    await host.updateComplete
    expect(states()).toEqual(['rotated', 'tilted'])
    control(host, 'layers-toggle')?.click()
    await host.updateComplete
    expect(hasState(host, 'layers-open')).toBe(true)
  })
})
