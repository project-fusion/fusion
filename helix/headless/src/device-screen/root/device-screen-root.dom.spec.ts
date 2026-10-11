import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Screen = HTMLElement & {
  capture: (type?: string) => Promise<Blob>
  press: (button: string, duration?: number) => void
  readonly: boolean
  screenshot: () => void
  showSwipe: (fromX: number, fromY: number, toX: number, toY: number, duration?: number) => void
  showTap: (x: number, y: number) => void
  updateComplete: Promise<boolean>
}

const device = async (extra = 'screen-width="400" screen-height="800"'): Promise<Screen> =>
  (await mount(
    `<helix-headless-device-screen label="iPhone 17 Pro" ${extra}>
      <canvas width="1200" height="2400"></canvas>
    </helix-headless-device-screen>`,
  )) as Screen

const screenOf = (host: Screen): HTMLElement => part(host, 'screen') as HTMLElement

/**
 * Gives the screen a drawn box. happy-dom lays nothing out and answers a box
 * of no size, so a spec that maps a pointer supplies the box a browser would
 * have drawn.
 */
const drawAt = (host: Screen, width = 200, height = 400): HTMLElement => {
  const screen = screenOf(host)
  screen.getBoundingClientRect = () =>
    ({ bottom: height, height, left: 0, right: width, top: 0, width, x: 0, y: 0 }) as DOMRect
  return screen
}

/** Every event of these names the host sends, in order, with its detail. */
const heard = (host: Screen, ...names: string[]): Array<{ detail: unknown; type: string }> => {
  const all: Array<{ detail: unknown; type: string }> = []
  for (const name of names) {
    host.addEventListener(name, (event) => {
      all.push({ detail: (event as CustomEvent).detail, type: event.type })
    })
  }
  return all
}

const pointer = (
  target: Element,
  type: string,
  x: number,
  y: number,
  init: PointerEventInit = {},
): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      ...init,
    }),
  )
}

const key = (target: Element, type: string, init: KeyboardEventInit): KeyboardEvent => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('device screen, touches', () => {
  test('a press that lifts where it landed is a touch down and up, and a tap, in the device’s units', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch', 'helix-device-tap', 'helix-device-swipe')
    pointer(screen, 'pointerdown', 50, 100)
    pointer(screen, 'pointerup', 50, 100)
    expect(events.map((one) => one.type)).toEqual([
      'helix-device-touch',
      'helix-device-touch',
      'helix-device-tap',
    ])
    expect(events[0]?.detail).toEqual({
      height: 800,
      id: 0,
      phase: 'down',
      width: 400,
      x: 100,
      y: 200,
    })
    expect(events[1]?.detail).toMatchObject({ phase: 'up', x: 100, y: 200 })
    expect(events[2]?.detail).toMatchObject({ height: 800, width: 400, x: 100, y: 200 })
  })

  test('a press that travels is a swipe from where it landed to where it lifted', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-tap', 'helix-device-swipe')
    pointer(screen, 'pointerdown', 50, 300)
    pointer(screen, 'pointermove', 50, 200)
    pointer(screen, 'pointerup', 50, 100)
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('helix-device-swipe')
    expect(events[0]?.detail).toMatchObject({ fromX: 100, fromY: 600, toX: 100, toY: 200 })
  })

  test('a finger that strays and comes back still swiped', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-tap', 'helix-device-swipe')
    pointer(screen, 'pointerdown', 50, 100)
    pointer(screen, 'pointermove', 150, 100)
    pointer(screen, 'pointerup', 50, 100)
    expect(events.map((one) => one.type)).toEqual(['helix-device-swipe'])
  })

  test('a finger that leaves the screen is held at its edge', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch')
    pointer(screen, 'pointerdown', 100, 200)
    pointer(screen, 'pointermove', 500, -40)
    expect(events[1]?.detail).toMatchObject({ phase: 'move', x: 400, y: 0 })
  })

  test('a touch the browser takes away is canceled, and is no gesture', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch', 'helix-device-tap')
    pointer(screen, 'pointerdown', 50, 100)
    pointer(screen, 'pointercancel', 50, 100)
    expect(events.map((one) => (one.detail as { phase?: string }).phase ?? one.type)).toEqual([
      'down',
      'cancel',
    ])
  })

  test('Alt with a drag is two touches mirrored about the middle, and no gesture', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch', 'helix-device-tap', 'helix-device-swipe')
    pointer(screen, 'pointerdown', 50, 100, { altKey: true })
    pointer(screen, 'pointerup', 50, 100, { altKey: true })
    expect(events.map((one) => one.detail)).toEqual([
      { height: 800, id: 0, phase: 'down', width: 400, x: 100, y: 200 },
      { height: 800, id: 1, phase: 'down', width: 400, x: 300, y: 600 },
      { height: 800, id: 0, phase: 'up', width: 400, x: 100, y: 200 },
      { height: 800, id: 1, phase: 'up', width: 400, x: 300, y: 600 },
    ])
  })

  test('a second finger takes the next number, and the two together are no gesture', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch', 'helix-device-tap')
    pointer(screen, 'pointerdown', 50, 100, { pointerId: 7, pointerType: 'touch' })
    pointer(screen, 'pointerdown', 150, 300, { pointerId: 8, pointerType: 'touch' })
    pointer(screen, 'pointerup', 50, 100, { pointerId: 7, pointerType: 'touch' })
    pointer(screen, 'pointerup', 150, 300, { pointerId: 8, pointerType: 'touch' })
    expect(events.map((one) => (one.detail as { id?: number }).id ?? one.type)).toEqual([
      0, 1, 0, 1,
    ])
  })

  test('a picture turned a quarter clockwise sends its drawn top left as the device’s bottom left', async () => {
    const host = await device('screen-width="400" screen-height="800" rotation="90"')
    const screen = drawAt(host, 400, 200)
    const events = heard(host, 'helix-device-tap')
    pointer(screen, 'pointerdown', 0, 0)
    pointer(screen, 'pointerup', 0, 0)
    expect(events[0]?.detail).toMatchObject({ height: 800, width: 400, x: 0, y: 800 })
  })

  test('without a size from the page, the points are in the stream’s own pixels', async () => {
    const host = await device('')
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-tap')
    pointer(screen, 'pointerdown', 100, 200)
    pointer(screen, 'pointerup', 100, 200)
    expect(events[0]?.detail).toMatchObject({ height: 2400, width: 1200, x: 600, y: 1200 })
  })

  test('a right click, a press off a round screen, and a read-only screen send nothing', async () => {
    const host = await device('screen-width="400" screen-height="400" shape="circle"')
    const screen = drawAt(host, 200, 200)
    const events = heard(host, 'helix-device-touch')
    pointer(screen, 'pointerdown', 100, 100, { button: 2 })
    pointer(screen, 'pointerdown', 5, 5)
    expect(events).toHaveLength(0)
    host.readonly = true
    await host.updateComplete
    pointer(screen, 'pointerdown', 100, 100)
    expect(events).toHaveLength(0)
  })

  test('a press takes focus, so keys follow', async () => {
    const host = await device()
    const screen = drawAt(host)
    pointer(screen, 'pointerdown', 50, 100)
    expect(host.shadowRoot?.activeElement).toBe(screen)
  })

  test('the screen says a finger is on it while one is', async () => {
    const host = await device()
    const screen = drawAt(host)
    pointer(screen, 'pointerdown', 50, 100)
    expect(hasState(host, 'touching')).toBe(true)
    pointer(screen, 'pointerup', 50, 100)
    expect(hasState(host, 'touching')).toBe(false)
  })

  test('with show-touches, a ring stands under the finger while it is down', async () => {
    const host = await device('screen-width="400" screen-height="800" show-touches')
    const screen = drawAt(host)
    pointer(screen, 'pointerdown', 50, 100)
    await host.updateComplete
    const ring = part(host, 'touch-held') as HTMLElement
    expect(ring?.getAttribute('style')).toContain('--device-screen-touch-x: 25.00%')
    expect(ring?.getAttribute('style')).toContain('--device-screen-touch-y: 25.00%')
    pointer(screen, 'pointerup', 50, 100)
    await host.updateComplete
    expect(part(host, 'touch-held')).toBeNull()
  })
})

describe('device screen, a wheel', () => {
  test('a wheel over the screen scrolls the device, in its units, and not the page', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-scroll')
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 100,
      deltaY: 40,
    })
    /* happy-dom's constructor leaves the position out, and a browser's does not. */
    Object.defineProperty(wheel, 'clientX', { value: 50 })
    Object.defineProperty(wheel, 'clientY', { value: 100 })
    screen.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(events[0]?.detail).toEqual({
      deltaX: 0,
      deltaY: 80,
      height: 800,
      width: 400,
      x: 100,
      y: 200,
    })
  })

  test('Control with the wheel is the page’s zoom, and stays the page’s', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-scroll')
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 50,
      clientY: 100,
      deltaY: 40,
    })
    /* happy-dom's constructor leaves the modifier out, and a browser's does not. */
    Object.defineProperty(wheel, 'ctrlKey', { value: true })
    screen.dispatchEvent(wheel)
    expect(events).toHaveLength(0)
    expect(wheel.defaultPrevented).toBe(false)
  })
})

describe('device screen, keys', () => {
  test('a key is sent as it goes down and again as it comes up, and kept from the page', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    const down = key(screen, 'keydown', { code: 'KeyA', key: 'a' })
    key(screen, 'keyup', { code: 'KeyA', key: 'a' })
    expect(down.defaultPrevented).toBe(true)
    expect(events.map((one) => one.detail)).toEqual([
      {
        altKey: false,
        code: 'KeyA',
        ctrlKey: false,
        key: 'a',
        metaKey: false,
        phase: 'down',
        repeat: false,
        shiftKey: false,
      },
      {
        altKey: false,
        code: 'KeyA',
        ctrlKey: false,
        key: 'a',
        metaKey: false,
        phase: 'up',
        repeat: false,
        shiftKey: false,
      },
    ])
  })

  test('Tab is never sent, so focus can always leave', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    const tab = key(screen, 'keydown', { code: 'Tab', key: 'Tab', shiftKey: true })
    expect(tab.defaultPrevented).toBe(false)
    expect(events).toHaveLength(0)
  })

  test('a shortcut is the browser’s, unless forward-shortcuts is set', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    const find = key(screen, 'keydown', { code: 'KeyF', ctrlKey: true, key: 'f' })
    expect(find.defaultPrevented).toBe(false)
    expect(events).toHaveLength(0)
    host.setAttribute('forward-shortcuts', '')
    await host.updateComplete
    key(screen, 'keydown', { code: 'KeyF', ctrlKey: true, key: 'f' })
    expect(events[0]?.detail).toMatchObject({ code: 'KeyF', ctrlKey: true, phase: 'down' })
  })

  test('the paste shortcut reaches the browser in every mode, which pastes as text', async () => {
    const host = await device('screen-width="400" screen-height="800" forward-shortcuts')
    const screen = screenOf(host)
    const keys = heard(host, 'helix-device-key', 'helix-device-text')
    const shortcut = key(screen, 'keydown', { code: 'KeyV', key: 'v', metaKey: true })
    expect(shortcut.defaultPrevented).toBe(false)
    const paste = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'hello' } })
    screen.dispatchEvent(paste)
    expect(paste.defaultPrevented).toBe(true)
    expect(keys).toEqual([{ detail: { text: 'hello' }, type: 'helix-device-text' }])
  })

  test('a key that went down elsewhere is not sent as it comes up on the screen', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    key(screen, 'keyup', { code: 'Tab', key: 'Tab' })
    expect(events).toHaveLength(0)
  })

  test('a key still down as focus leaves is sent as released', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    key(screen, 'keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true })
    screen.dispatchEvent(new FocusEvent('blur'))
    expect(events.map((one) => (one.detail as { phase: string }).phase)).toEqual(['down', 'up'])
    expect(events[1]?.detail).toMatchObject({ code: 'ShiftLeft', key: 'Shift' })
  })

  test('a read-only screen sends no keys', async () => {
    const host = await device('screen-width="400" screen-height="800" readonly')
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    key(screen, 'keydown', { code: 'KeyA', key: 'a' })
    expect(events).toHaveLength(0)
  })
})

describe('device screen, buttons', () => {
  const every = 'controls="back home recents power volume rotate screenshot fullscreen"'

  test('every button is drawn in one order, named', async () => {
    const host = await device(every)
    const names = [...(host.shadowRoot?.querySelectorAll('[part="controls"] button') ?? [])].map(
      (button) => button.getAttribute('part'),
    )
    expect(names).toEqual([
      'back',
      'home',
      'recents',
      'power',
      'volume-up',
      'volume-down',
      'rotate-left',
      'rotate-right',
      'screenshot',
      'fullscreen',
    ])
    expect(part(host, 'recents')?.getAttribute('aria-label')).toBe('Recent apps')
  })

  test('a button sends the press, with no length from a key or a script', async () => {
    const host = await device(every)
    const events = heard(host, 'helix-device-button', 'helix-device-screenshot')
    ;(part(host, 'home') as HTMLElement).click()
    ;(part(host, 'screenshot') as HTMLElement).click()
    host.press('volume-up', 250)
    host.screenshot()
    expect(events).toEqual([
      { detail: { button: 'home', duration: 0 }, type: 'helix-device-button' },
      { detail: undefined, type: 'helix-device-screenshot' },
      { detail: { button: 'volume-up', duration: 250 }, type: 'helix-device-button' },
      { detail: undefined, type: 'helix-device-screenshot' },
    ])
  })

  test('a read-only screen keeps its screenshot and fullscreen buttons and turns off the rest', async () => {
    const host = await device(`${every} readonly`)
    const off = [...(host.shadowRoot?.querySelectorAll('[part="controls"] button') ?? [])]
      .filter((button) => (button as HTMLButtonElement).disabled)
      .map((button) => button.getAttribute('part'))
    expect(off).not.toContain('screenshot')
    expect(off).not.toContain('fullscreen')
    expect(off).toContain('home')
  })

  test('the group of buttons is named', async () => {
    const host = await device()
    const group = part(host, 'controls')
    expect(group?.getAttribute('role')).toBe('group')
    expect(group?.getAttribute('aria-label')).toBe('Device controls')
  })
})

describe('device screen, names and states', () => {
  test('the screen is named for the device and described by what its keys do', async () => {
    const host = await device()
    const screen = screenOf(host)
    expect(screen.getAttribute('aria-label')).toBe('iPhone 17 Pro')
    const scope = screen.getRootNode() as ShadowRoot
    const hint = scope.getElementById(screen.getAttribute('aria-describedby') ?? '')
    expect(hint).toBe(part(host, 'keys-hint') as HTMLElement | null)
    expect(hint?.textContent).toBe(
      'Keys you press go to the device. Press Tab to leave the screen.',
    )
  })

  test('a frame with no stream inside says so, and one with a stream does not', async () => {
    const bare = (await mount(
      '<helix-headless-device-screen label="iPhone"></helix-headless-device-screen>',
    )) as Screen
    expect(hasState(bare, 'empty')).toBe(true)
    const host = await device()
    expect(hasState(host, 'empty')).toBe(false)
  })

  test('loading shows its words in a live region, and takes them away after', async () => {
    const host = await device('screen-width="400" screen-height="800" loading')
    const loading = part(host, 'loading')
    expect(loading?.getAttribute('role')).toBe('status')
    expect(loading?.textContent?.trim()).toBe('Connecting to the device')
    expect(hasState(host, 'loading')).toBe(true)
    host.removeAttribute('loading')
    await host.updateComplete
    expect(loading?.textContent?.trim()).toBe('')
  })

  test('a picture turned a quarter says it is sideways', async () => {
    const host = await device('screen-width="400" screen-height="800" rotation="270"')
    expect(hasState(host, 'sideways')).toBe(true)
    expect(part(host, 'region')?.getAttribute('style')).toContain(
      '--device-screen-rotation: 270deg',
    )
  })
})

describe('device screen, marks and capture', () => {
  test('showTap draws a ring where the device was touched, turned with the picture', async () => {
    const host = await device('screen-width="400" screen-height="800" rotation="90"')
    host.showTap(0, 800)
    await host.updateComplete
    const ring = part(host, 'touch') as HTMLElement
    expect(ring.getAttribute('style')).toContain('--device-screen-touch-x: 0.00%')
    expect(ring.getAttribute('style')).toContain('--device-screen-touch-y: 0.00%')
    expect(ring.getAttribute('aria-hidden')).toBe('true')
  })

  test('showSwipe draws a ring that travels for as long as the swipe took', async () => {
    const host = await device()
    host.showSwipe(200, 600, 200, 200, 400)
    await host.updateComplete
    const style = (part(host, 'touch') as HTMLElement).getAttribute('style') ?? ''
    expect(style).toContain('--device-screen-touch-to-y: 25.00%')
    expect(style).toContain('--device-screen-touch-duration: 400ms')
  })

  test('capture fails with the reason where there is no stream', async () => {
    const bare = (await mount(
      '<helix-headless-device-screen label="iPhone"></helix-headless-device-screen>',
    )) as Screen
    let reason = ''
    try {
      await bare.capture()
    } catch (error) {
      reason = (error as Error).message
    }
    expect(reason).toContain('has no stream to capture')
  })
})
