import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

/** A paste carrying text, which crosses shadow roots as a browser's does. */
const pasting = (text: string): ClipboardEvent => {
  const paste = new Event('paste', { bubbles: true, cancelable: true, composed: true })
  Object.defineProperty(paste, 'clipboardData', { value: { getData: () => text } })
  return paste as ClipboardEvent
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

  test('a wheel that counts in pages moves a page across by the width and down by the height', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-scroll')
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaMode: 2,
      deltaX: 1,
      deltaY: 1,
    })
    Object.defineProperty(wheel, 'clientX', { value: 50 })
    Object.defineProperty(wheel, 'clientY', { value: 100 })
    Object.defineProperty(wheel, 'deltaMode', { value: 2 })
    screen.dispatchEvent(wheel)
    expect(events[0]?.detail).toMatchObject({ deltaX: 400, deltaY: 800 })
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
    screen.focus()
    const paste = pasting('hello')
    screen.dispatchEvent(paste)
    expect(paste.defaultPrevented).toBe(true)
    expect(keys).toEqual([{ detail: { text: 'hello' }, type: 'helix-device-text' }])
  })

  test('a paste is the screen’s wherever the browser sends it while the screen has focus', async () => {
    /* WebKit sends it to the host, and either engine to text selected on the page. */
    const host = await device()
    const screen = screenOf(host)
    const selected = document.createElement('p')
    document.body.append(selected)
    const texts = heard(host, 'helix-device-text')
    screen.focus()
    host.dispatchEvent(pasting('to the host'))
    selected.dispatchEvent(pasting('to the selection'))
    expect(texts.map((event) => event.detail)).toEqual([
      { text: 'to the host' },
      { text: 'to the selection' },
    ])
    selected.remove()
  })

  test('a paste while the screen does not have focus is left to the page', async () => {
    const host = await device()
    const field = document.createElement('textarea')
    document.body.append(field)
    const texts = heard(host, 'helix-device-text')
    field.focus()
    const paste = pasting('to the field')
    field.dispatchEvent(paste)
    expect(paste.defaultPrevented).toBe(false)
    expect(texts).toHaveLength(0)
    field.remove()
  })

  test('the paste shortcut is known by its key on any layout', async () => {
    /* A Russian layout's V types м, and the browser still pastes. */
    const host = await device('screen-width="400" screen-height="800" forward-shortcuts')
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    const shortcut = key(screen, 'keydown', { code: 'KeyV', key: 'м', metaKey: true })
    expect(shortcut.defaultPrevented).toBe(false)
    expect(events).toHaveLength(0)
  })

  test('keys a soft keyboard reports with no code are each released', async () => {
    const host = await device()
    const screen = screenOf(host)
    const events = heard(host, 'helix-device-key')
    key(screen, 'keydown', { code: '', key: 'a' })
    key(screen, 'keydown', { code: '', key: 'b' })
    key(screen, 'keyup', { code: '', key: 'a' })
    key(screen, 'keyup', { code: '', key: 'b' })
    expect(
      events.map(
        (one) =>
          `${(one.detail as { key: string }).key}:${(one.detail as { phase: string }).phase}`,
      ),
    ).toEqual(['a:down', 'b:down', 'a:up', 'b:up'])
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
    const names = [
      ...(host.shadowRoot?.querySelectorAll('[part="controls"] > helix-headless-icon-button') ??
        []),
    ].map((button) => button.getAttribute('part'))
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
    expect(part(host, 'recents')?.getAttribute('label')).toBe('Recent apps')
  })

  test('no button is raised, there being nothing to paint', async () => {
    const host = await device(every)
    const raised = [
      ...(host.shadowRoot?.querySelectorAll('[part="controls"] > helix-headless-icon-button') ??
        []),
    ].filter((button) => button.hasAttribute('raised'))
    expect(raised).toEqual([])
  })

  test('each button is an Icon Button whose press stays inside the frame', async () => {
    const host = await device()
    const presses: Event[] = []
    host.addEventListener('helix-press', (event) => presses.push(event))
    const home = part(host, 'home') as HTMLElement
    expect(home.localName).toBe('helix-headless-icon-button')
    home.dispatchEvent(new CustomEvent('helix-press', { bubbles: true, composed: true }))
    expect(presses).toHaveLength(0)
  })

  test('buttons of the page’s own join the row before the fullscreen button', async () => {
    const host = (await mount(
      `<helix-headless-device-screen label="iPhone" controls="home fullscreen">
        <button slot="controls" id="record">Record</button>
      </helix-headless-device-screen>`,
    )) as Screen
    const row = part(host, 'controls') as HTMLElement
    const slot = row.querySelector('slot[name="controls"]') as HTMLSlotElement
    expect(slot.assignedElements()).toEqual([host.querySelector('#record') as Element])
    expect(slot.nextElementSibling?.getAttribute('part')).toBe('fullscreen')
  })

  test('a row of none is drawn after all when the page puts a button in it, even later', async () => {
    const host = (await mount(
      '<helix-headless-device-screen label="iPhone" controls="none"></helix-headless-device-screen>',
    )) as Screen
    expect(part(host, 'controls')).toBeNull()
    const record = document.createElement('button')
    record.slot = 'controls'
    host.append(record)
    /* The child watch runs on a microtask, and the update after it. */
    await Promise.resolve()
    await host.updateComplete
    expect(part(host, 'controls')).not.toBeNull()
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
    const off = [
      ...(host.shadowRoot?.querySelectorAll('[part="controls"] > helix-headless-icon-button') ??
        []),
    ]
      .filter((button) => (button as HTMLElement & { disabled: boolean }).disabled)
      .map((button) => button.getAttribute('part'))
    expect(off).not.toContain('screenshot')
    expect(off).not.toContain('fullscreen')
    expect(off).toContain('home')
  })

  test('the buttons are one named toolbar, a single tab stop on the first', async () => {
    const host = (await mount(
      `<helix-headless-device-screen label="iPhone" controls="home screenshot">
        <button slot="controls" id="record">Record</button>
      </helix-headless-device-screen>`,
    )) as Screen
    /* The stop is kept once every button has upgraded, a task after the update. */
    await new Promise((resolve) => setTimeout(resolve, 0))
    const row = part(host, 'controls')
    expect(row?.getAttribute('role')).toBe('toolbar')
    expect(row?.getAttribute('aria-label')).toBe('Device controls')
    expect(row?.hasAttribute('aria-orientation')).toBe(false)
    const stops = [
      ...(row?.querySelectorAll<HTMLElement & { focusable: boolean }>(
        'helix-headless-icon-button',
      ) ?? []),
    ].map((button) => button.focusable)
    expect(stops).toEqual([true, false])
    expect(host.querySelector('#record')?.getAttribute('tabindex')).toBe('-1')
  })

  test('the arrow keys move the stop along the row, and up and down a column', async () => {
    const press = (from: Element, key: string): void => {
      from.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key }))
    }
    const focusable = (host: Screen, name: string): boolean =>
      (part(host, name) as HTMLElement & { focusable: boolean }).focusable
    const row = await device()
    await new Promise((resolve) => setTimeout(resolve, 0))
    press(part(row, 'home') as Element, 'ArrowDown')
    expect(focusable(row, 'home')).toBe(true)
    press(part(row, 'home') as Element, 'ArrowRight')
    expect(focusable(row, 'screenshot')).toBe(true)
    expect(focusable(row, 'home')).toBe(false)

    const column = await device('controls-placement="end"')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(part(column, 'controls')?.getAttribute('aria-orientation')).toBe('vertical')
    press(part(column, 'home') as Element, 'ArrowRight')
    expect(focusable(column, 'home')).toBe(true)
    press(part(column, 'home') as Element, 'ArrowDown')
    expect(focusable(column, 'screenshot')).toBe(true)
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
    /* Hidden, so it is heard once, as the description, and not again as text
       after the device. */
    expect(hint?.getAttribute('aria-hidden')).toBe('true')
  })

  test('the screen takes every touch while it sends them, and leaves the page its scroll while read-only', async () => {
    const host = await device()
    expect(screenOf(host).hasAttribute('data-touches')).toBe(true)
    host.readonly = true
    await host.updateComplete
    expect(screenOf(host).hasAttribute('data-touches')).toBe(false)
  })

  test('a frame with no stream inside says so, and one with a stream does not', async () => {
    const bare = (await mount(
      '<helix-headless-device-screen label="iPhone"></helix-headless-device-screen>',
    )) as Screen
    expect(hasState(bare, 'empty')).toBe(true)
    const host = await device()
    expect(hasState(host, 'empty')).toBe(false)
  })

  test('the empty slot stands beside the screen while no stream is inside', async () => {
    /* Beside, and placed over it: inside, the screen's touches and keys
       swallowed a button, and a read-only screen, a picture, hid its words. */
    const bare = (await mount(
      `<helix-headless-device-screen label="iPhone">
        <span slot="empty">No simulator is running</span>
      </helix-headless-device-screen>`,
    )) as Screen
    const empty = part(bare, 'empty') as HTMLElement
    expect(screenOf(bare).contains(empty)).toBe(false)
    expect(empty.querySelector('slot[name="empty"]')).not.toBeNull()
    const host = await device()
    expect(part(host, 'empty')).toBeNull()
  })

  test('a button in the empty slot is pressed and typed into as a button is, and nothing is sent', async () => {
    const bare = (await mount(
      `<helix-headless-device-screen label="iPhone">
        <button slot="empty" id="boot">Boot the simulator</button>
      </helix-headless-device-screen>`,
    )) as Screen
    const events = heard(bare, 'helix-device-touch', 'helix-device-key')
    const boot = bare.querySelector('#boot') as HTMLButtonElement
    pointer(boot, 'pointerdown', 5, 5)
    const enter = key(boot, 'keydown', { code: 'Enter', key: 'Enter' })
    expect(events).toHaveLength(0)
    expect(enter.defaultPrevented).toBe(false)
  })

  test('the empty slot waits while the stream is loading, so the two never overlap', async () => {
    const bare = (await mount(
      `<helix-headless-device-screen label="iPhone" loading>
        <span slot="empty">No simulator is running</span>
      </helix-headless-device-screen>`,
    )) as Screen
    expect(part(bare, 'empty')).toBeNull()
    bare.removeAttribute('loading')
    await bare.updateComplete
    expect(part(bare, 'empty')).not.toBeNull()
  })

  test('loading shows its words over the screen and says them in a live region, and takes them away after', async () => {
    const host = await device('screen-width="400" screen-height="800" loading')
    const loading = part(host, 'loading')
    const live = part(host, 'live')
    expect(loading?.textContent?.trim()).toBe('Connecting to the device')
    expect(loading?.getAttribute('aria-hidden')).toBe('true')
    expect(live?.getAttribute('role')).toBe('status')
    expect(live?.textContent).toBe('Connecting to the device')
    expect(hasState(host, 'loading')).toBe(true)
    host.removeAttribute('loading')
    await host.updateComplete
    expect(loading?.textContent?.trim()).toBe('')
    expect(live?.textContent).toBe('')
  })

  test('a read-only screen still says it is loading, from outside the picture', async () => {
    /* A picture's children are hidden from a screen reader, so a live region
       inside the read-only screen would say nothing. */
    const host = await device('screen-width="400" screen-height="800" readonly loading')
    const live = part(host, 'live') as HTMLElement
    expect(screenOf(host).contains(live)).toBe(false)
    expect(live.textContent).toBe('Connecting to the device')
  })

  test('a picture turned a quarter says it is sideways', async () => {
    const host = await device('screen-width="400" screen-height="800" rotation="270"')
    expect(hasState(host, 'sideways')).toBe(true)
    expect(part(host, 'region')?.getAttribute('style')).toContain(
      '--device-screen-rotation: 270deg',
    )
  })
})

describe('device screen, its size', () => {
  test('a width from the page alone takes its height from the stream’s shape, never its pixels', async () => {
    const host = await device('screen-width="400"')
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-tap')
    pointer(screen, 'pointerdown', 100, 200)
    pointer(screen, 'pointerup', 100, 200)
    expect(events[0]?.detail).toMatchObject({ height: 800, width: 400, x: 200, y: 400 })
  })

  test('a width alone, before the stream says its size, takes its height from the drawn screen', async () => {
    const bare = (await mount(
      '<helix-headless-device-screen label="iPhone" screen-width="400"></helix-headless-device-screen>',
    )) as Screen
    const screen = drawAt(bare)
    const events = heard(bare, 'helix-device-tap')
    pointer(screen, 'pointerdown', 100, 200)
    pointer(screen, 'pointerup', 100, 200)
    expect(events[0]?.detail).toMatchObject({ height: 800, width: 400, x: 200, y: 400 })
  })

  test('a height alone takes its width the same way', async () => {
    const host = await device('screen-height="800"')
    expect(part(host, 'region')?.getAttribute('style')).toContain('--device-screen-ratio: 0.5;')
  })
})

describe('device screen, taken off the page', () => {
  test('a finger down as it goes is sent as canceled, and a key down as released', async () => {
    const host = await device()
    const screen = drawAt(host)
    const events = heard(host, 'helix-device-touch', 'helix-device-key')
    pointer(screen, 'pointerdown', 50, 100)
    key(screen, 'keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true })
    host.remove()
    /* Once each, in either order: Chromium blurs a focused element it takes
       away, which releases the key before the frame hears it is gone. */
    expect(
      events.map((one) => `${one.type}:${(one.detail as { phase: string }).phase}`).sort(),
    ).toEqual([
      'helix-device-key:down',
      'helix-device-key:up',
      'helix-device-touch:cancel',
      'helix-device-touch:down',
    ])
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

  test('with no size from the page or the stream, a ring is placed in the drawn screen’s pixels, as events are', async () => {
    const bare = (await mount(
      '<helix-headless-device-screen label="iPhone"></helix-headless-device-screen>',
    )) as Screen
    drawAt(bare, 200, 400)
    bare.showTap(100, 200)
    await bare.updateComplete
    const style = (part(bare, 'touch') as HTMLElement).getAttribute('style') ?? ''
    expect(style).toContain('--device-screen-touch-x: 50.00%')
    expect(style).toContain('--device-screen-touch-y: 50.00%')
  })

  test('showSwipe draws a ring that travels for as long as the swipe took', async () => {
    const host = await device()
    host.showSwipe(200, 600, 200, 200, 400)
    await host.updateComplete
    const style = (part(host, 'touch') as HTMLElement).getAttribute('style') ?? ''
    expect(style).toContain('--device-screen-touch-to-y: 25.00%')
    expect(style).toContain('--device-screen-touch-duration: 400ms')
  })

  /* Browser only: happy-dom draws no canvas. */
  if (hasLayout()) {
    test('capture reads the size of the stream it draws, even one put in a moment ago', async () => {
      const host = await device('')
      const swapped = document.createElement('canvas')
      swapped.width = 30
      swapped.height = 60
      host.querySelector('canvas')?.replaceWith(swapped)
      const bitmap = await createImageBitmap(await host.capture())
      expect([bitmap.width, bitmap.height]).toEqual([30, 60])
    })
  }

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
