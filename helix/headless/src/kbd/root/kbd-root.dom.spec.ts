import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

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

/**
 * What the element draws, which was being typed by hand and was wrong.
 *
 * happy-dom reports a non-Apple user agent, so these assert the form a reader
 * on Windows or Linux gets. That is the half that was broken: a literal `⌘K` in
 * a template tells them to press a key their keyboard does not have.
 */
describe('a key drawn from a chord', () => {
  test('mod is the platform modifier, which is the whole reason to write a chord', async () => {
    expect(label(await kbd('keys="mod+k"'))).toBe('Ctrl+K')
  })

  test('a lone key needs no separator and is upper cased', async () => {
    expect(label(await kbd('keys="/"'))).toBe('/')
  })

  test('named keys are spelled, so a chord reads as something to press', async () => {
    expect(label(await kbd('keys="shift+enter"'))).toBe('Shift+Enter')
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
