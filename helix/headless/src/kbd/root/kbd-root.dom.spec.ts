import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Kbd = HTMLElement & { keys: string; updateComplete: Promise<unknown> }

const kbd = async (attrs = '', inner = ''): Promise<Kbd> => {
  const host = (await mount(`<helix-headless-kbd ${attrs}>${inner}</helix-headless-kbd>`)) as Kbd
  await host.updateComplete
  return host
}

const label = (host: Kbd): string => (part(host, 'kbd') as HTMLElement).textContent?.trim() ?? ''

const APPLE_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const OTHER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Runs a mount against a stated platform rather than the one running the suite.
 *
 * **The element reads `navigator.userAgent` at render, and this file is run
 * twice on two different ones.** `.dom.spec.ts` is compiled into a browser spec
 * as well as run under happy-dom, so an unstubbed assertion is answered by
 * happy-dom's non-Apple agent in `bun test` and by the host's real one in
 * Chromium, and passes or fails by which machine ran it. Stubbing also fixes
 * the half that is otherwise invisible: only one of the two maps is ever
 * exercised, and `mod` existing at all is a claim about both.
 *
 * An own property shadows the prototype getter and `delete` uncovers it again,
 * which is the restore for a real browser. happy-dom defines it on the instance
 * instead, so the descriptor it had is put back when there was one.
 */
const onPlatform = async <T>(agent: string, run: () => Promise<T>): Promise<T> => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: agent })
  try {
    return await run()
  } finally {
    if (original === undefined) {
      delete (navigator as { userAgent?: string }).userAgent
    } else {
      Object.defineProperty(navigator, 'userAgent', original)
    }
  }
}

/**
 * What the element draws, on both platforms stated rather than inherited from
 * whoever is running the suite, which is what `onPlatform` is for. A literal
 * `⌘K` in a template tells a reader on Windows to press a key their keyboard
 * does not have.
 */
describe('a key drawn from a chord', () => {
  test('mod is the platform modifier, which is the whole reason to write a chord', async () => {
    expect(await onPlatform(OTHER_AGENT, async () => label(await kbd('keys="mod+k"')))).toBe(
      'Ctrl+K',
    )
    expect(await onPlatform(APPLE_AGENT, async () => label(await kbd('keys="mod+k"')))).toBe('⌘K')
  })

  test('a lone key needs no separator and is upper cased', async () => {
    expect(label(await kbd('keys="/"'))).toBe('/')
  })

  test('named keys are spelled, so a chord reads as something to press', async () => {
    expect(await onPlatform(OTHER_AGENT, async () => label(await kbd('keys="shift+enter"')))).toBe(
      'Shift+Enter',
    )
    expect(await onPlatform(APPLE_AGENT, async () => label(await kbd('keys="shift+enter"')))).toBe(
      '⇧↵',
    )
  })

  test('without keys it slots what it was given, which is every use before this', async () => {
    /* The slot rather than its text: slotted content stays in the light DOM, so
       reading the shadow's `textContent` reports nothing whether or not the
       slot is there and would pass for the wrong reason. */
    const host = await kbd('', 'Esc')
    expect((part(host, 'kbd') as HTMLElement).querySelector('slot')).not.toBeNull()
  })

  test('with keys it draws them instead, so the two never both appear', async () => {
    const host = await kbd('keys="esc"', 'Esc')
    expect({
      slotted: (part(host, 'kbd') as HTMLElement).querySelector('slot') !== null,
      text: label(host),
    }).toEqual({ slotted: false, text: 'Esc' })
  })
})

describe('kbd', () => {
  test('renders a real kbd, so the markup still means "press this"', async () => {
    const host = await mount('<helix-headless-kbd>K</helix-headless-kbd>')
    expect(part(host, 'kbd')?.tagName).toBe('KBD')
  })
})

/**
 * What it listens for, and the fact that by default it listens for nothing.
 */
describe('a key that binds', () => {
  const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init })
    target.dispatchEvent(event)
    return event
  }

  test('unset within binds nothing, which is what a label does', async () => {
    const host = await kbd('keys="/"')
    let heard = 0
    host.addEventListener('helix-shortcut', () => {
      heard += 1
    })
    press(host.parentElement as EventTarget, '/')
    expect(heard).toBe(0)
  })

  test('control listens in the control it sits inside', async () => {
    const host = await kbd('keys="/" within="control"')
    let heard = ''
    host.addEventListener('helix-shortcut', (event) => {
      heard = (event as CustomEvent<{ keys: string }>).detail.keys
    })
    const event = press(host.parentElement as EventTarget, '/')
    expect({ heard, tookTheKey: event.defaultPrevented }).toEqual({ heard: '/', tookTheKey: true })
  })

  test('a chord a reader did not press goes to whoever wanted it', async () => {
    // `mod+k` is not `shift+mod+k`. Modifiers are checked both ways round, so a
    // near miss is not a hit and the keystroke carries on.
    const host = await kbd('keys="mod+k" within="control"')
    let heard = 0
    host.addEventListener('helix-shortcut', () => {
      heard += 1
    })
    press(host.parentElement as EventTarget, 'k', { ctrlKey: true, shiftKey: true })
    expect(heard).toBe(0)
  })

  test('a consumer that refuses it leaves the keystroke alone', async () => {
    /* The escape for the cases a label cannot know about: a dialog is over the
       control, the moment is wrong, the reader is somewhere else. Refused, the
       key goes on to whatever would have had it. */
    const host = await kbd('keys="/" within="control"')
    host.addEventListener('helix-shortcut', (event) => event.preventDefault())
    const event = press(host.parentElement as EventTarget, '/')
    expect(event.defaultPrevented).toBe(false)
  })

  test('a press mid-composition belongs to the text, not to the chord', async () => {
    const host = await kbd('keys="/" within="control"')
    let heard = 0
    host.addEventListener('helix-shortcut', () => {
      heard += 1
    })
    press(host.parentElement as EventTarget, '/', { isComposing: true } as KeyboardEventInit)
    expect(heard).toBe(0)
  })
})
