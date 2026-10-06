import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & {
  dismiss(): boolean
  duration?: number
  open: boolean
  pause(): void
  resume(): void
  updateComplete: Promise<boolean>
}

/**
 * How long to wait on a 40ms clock before calling it stopped.
 *
 * **Not a fixed sleep: 250ms was six times the duration and still lost.** A
 * loaded runner throttles timers, and the clock these assert is one hover or
 * focus away from being held deliberately. Waiting on the outcome costs nothing
 * when it passes, which is almost always.
 *
 * **Under the harness timeout.** `TIMEOUT` in
 * `@fusion.dev/helix-testing/browser` is 2000ms, so a poll of exactly that kills
 * the test before it can assert and prints `timed out after 2000ms` where the
 * diagnostic should be. A budget has to leave room to report.
 */
const LATEST = 1200

/** Polls to the outcome rather than sleeping at it. */
const closes = async (found: Item): Promise<void> => {
  const until = Date.now() + LATEST
  while (Date.now() < until && found.open) {
    await new Promise((done) => setTimeout(done, 20))
  }
  await found.updateComplete
}

/**
 * The state, compared as a string so the failure carries it.
 *
 * **`expect(value, message)` drops the message under bun**, leaving
 * `expected true to be false` and nothing else. What is needed is whether the
 * clock was stopped on purpose: a timer that did not fire and a timer that was
 * deliberately held are different faults, and the pause on hover and focus is
 * what makes the second one possible. Folding it into the compared value is the
 * only form bun prints.
 */
const state = (found: Item): string =>
  `open=${found.open} paused=${found.hasAttribute('data-paused')}`

const region = async (items = ''): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-toast label="Notifications">${items}</helix-headless-toast>`,
  )) as HTMLElement

/** Puts back a global a case replaced. */
let restore: (() => void) | undefined

afterEach(() => {
  restore?.()
  restore = undefined
})

describe('toast region', () => {
  test('is a landmark, and not itself a live region', async () => {
    /* A region, so a reader finds the stack among the page's landmarks. Not
       live: a polite stack holding an assertive danger message made that
       message news to both. The `live` parts say each arrival once. */
    const host = await region()
    const internals = (host as unknown as { internals?: ElementInternals }).internals
    expect(internals?.role).toBe('region')
    expect(internals?.ariaLive ?? null).toBeNull()
  })

  test('says its hotkey in its name, in the consumer’s words', async () => {
    const host = (await mount(
      '<helix-headless-toast label="Mitteilungen ({hotkey})" hotkey="Alt+T"></helix-headless-toast>',
    )) as HTMLElement
    expect((host as unknown as { internals?: ElementInternals }).internals?.ariaLabel).toBe(
      'Mitteilungen (Alt+T)',
    )
    const plain = (await mount('<helix-headless-toast></helix-headless-toast>')) as HTMLElement
    expect((plain as unknown as { internals?: ElementInternals }).internals?.ariaLabel).toBe(
      'Notifications (F8)',
    )
  })

  test('says an arrival once, politely, and a danger one assertively, and nothing when one goes', async () => {
    const host = await region()
    const [polite, urgent] = [...(host.shadowRoot?.querySelectorAll('[part="live"]') ?? [])]
    expect(polite?.getAttribute('role')).toBe('status')
    expect(urgent?.getAttribute('role')).toBe('alert')
    const frame = (): Promise<void> => new Promise((done) => setTimeout(done, 40))
    const words = (): string[] => [polite?.textContent ?? '', urgent?.textContent ?? '']
    const add = host as HTMLElement & {
      add(
        message: string,
        options?: { action?: Element; heading?: string; tone?: string },
      ): HTMLElement
      updateComplete: Promise<unknown>
    }
    const undo = document.createElement('button')
    undo.textContent = 'Undo'
    const saved = add.add('Your changes are kept.', {
      action: undo,
      heading: 'Draft saved',
    }) as Item
    await frame()
    await add.updateComplete
    expect(words()).toEqual(['Draft saved. Your changes are kept.', ''])
    add.add('Could not reach the server', { tone: 'danger' })
    await frame()
    await add.updateComplete
    expect(words()).toEqual(['', 'Error. Could not reach the server'])
    await new Promise((done) => setTimeout(done, 1100))
    await add.updateComplete
    expect(words()).toEqual(['', ''])
    /* A dismissal read aloud is every removal narrated. */
    saved.dismiss()
    await frame()
    await add.updateComplete
    expect(words()).toEqual(['', ''])
  })

  test('says messages added in one task as separate sentences', async () => {
    const host = (await region()) as HTMLElement & {
      add(message: string): HTMLElement
      updateComplete: Promise<unknown>
    }
    const [polite] = [...(host.shadowRoot?.querySelectorAll('[part="live"]') ?? [])]
    host.add('Saved to drafts')
    host.add('Upload finished')
    await new Promise((done) => setTimeout(done, 40))
    await host.updateComplete
    expect(polite?.textContent).toBe('Saved to drafts. Upload finished')
  })

  test('says every message that arrives before the frame, from separate tasks', async () => {
    /* The accessibility tree is built once a frame, so a second arrival in a
       later task of the same frame must add to the words and not replace them. */
    const frames: FrameRequestCallback[] = []
    const real = globalThis.requestAnimationFrame
    restore = () => {
      globalThis.requestAnimationFrame = real
    }
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      frames.push(callback)
      return frames.length
    }
    const host = (await region()) as HTMLElement & {
      add(message: string, options?: { tone?: string }): HTMLElement
      updateComplete: Promise<unknown>
    }
    const [polite, urgent] = [...(host.shadowRoot?.querySelectorAll('[part="live"]') ?? [])]
    host.add('First')
    await new Promise((done) => setTimeout(done, 0))
    host.add('Second')
    host.add('Gone', { tone: 'danger' })
    await new Promise((done) => setTimeout(done, 0))
    for (const callback of frames.splice(0)) {
      callback(0)
    }
    await host.updateComplete
    expect([polite?.textContent, urgent?.textContent]).toEqual(['First. Second', 'Error. Gone'])
  })

  test('the name is on the host through internals, not as an attribute', async () => {
    const host = await region()
    expect(host.hasAttribute('role')).toBe(false)
    expect((host as unknown as { internals?: ElementInternals }).internals?.ariaLabel).toBe(
      'Notifications',
    )
  })
})

describe('toast item', () => {
  const item = async (attrs = ''): Promise<Item> => {
    const host = await region(
      `<helix-headless-toast-item ${attrs}>Saved</helix-headless-toast-item>`,
    )
    const found = host.querySelector('helix-headless-toast-item') as Item
    await found.updateComplete
    return found
  }

  test('it goes when asked, and takes itself out of no list at all', async () => {
    /* Two halves. The message hides itself, which is what every other stateful
       thing here does when nothing has claimed it, and it stays in the DOM,
       because the consumer owns the list and a node removed under a framework
       would be put straight back. */
    const found = await item('dismissible')
    let seen = ''
    found.addEventListener('helix-dismiss', (event) => {
      seen = (event as CustomEvent<{ label: string }>).detail.label
    })
    expect(found.dismiss()).toBe(true)
    expect(seen).toBe('Saved')
    // The property answers at once; the mirror is written by the next render,
    // which is what `data-` attributes are and why they are not the state.
    expect(found.open).toBe(false)
    await found.updateComplete
    expect(found.hasAttribute('data-closed')).toBe(true)
    expect(found.isConnected).toBe(true)
  })

  test('a declared `open` is a seed, and dismissing closes it', async () => {
    /* The element dismisses itself, and a consumer who wants the decision
       refuses it. Declaring `open` is a seed and not a claim of ownership, so
       it does not turn that off. */
    const found = await item('dismissible open')
    let asked = false
    found.addEventListener('helix-dismiss', () => {
      asked = true
    })
    found.dismiss()
    await found.updateComplete
    expect(asked).toBe(true)
    expect(found.open).toBe(false)

    found.open = false
    await found.updateComplete
    expect(found.open).toBe(false)
  })

  test('a refused dismissal leaves it showing', async () => {
    const found = await item('dismissible')
    found.addEventListener('helix-dismiss', (event) => event.preventDefault())
    expect(found.dismiss()).toBe(false)
    await found.updateComplete
    expect(found.open).toBe(true)
  })

  test('a timer that runs out hides it, which is what a duration is for', async () => {
    const found = await item('duration="40"')
    await closes(found)
    expect(state(found)).toBe('open=false paused=false')
  })

  test('a refused dismissal reports that it was refused', async () => {
    const found = await item('dismissible')
    found.addEventListener('helix-dismiss', (event) => event.preventDefault())
    expect(found.dismiss()).toBe(false)
  })

  test('no duration means it never asks to go on its own', async () => {
    const found = await item()
    let asked = false
    found.addEventListener('helix-dismiss', () => {
      asked = true
    })
    await new Promise((done) => setTimeout(done, 60))
    expect(asked).toBe(false)
  })

  test('a duration asks to go once it is up', async () => {
    const found = await item('duration="40"')
    const asked = await new Promise<boolean>((done) => {
      found.addEventListener('helix-dismiss', () => done(true))
      setTimeout(() => done(false), LATEST)
    })
    expect(`asked=${asked} ${state(found)}`).toBe('asked=true open=false paused=false')
  })

  test('the clock stops while it is being read, and goes on from there', async () => {
    /* The case that matters is a keyboard reader tabbing towards the action
       inside a toast: the timer must not race them. Resuming continues rather
       than restarting, so crossing it with a pointer does not grant a full
       second life every time. */
    const found = await item('duration="80"')
    found.pause()
    let asked = false
    found.addEventListener('helix-dismiss', () => {
      asked = true
    })
    await new Promise((done) => setTimeout(done, 160))
    expect(asked).toBe(false)

    found.resume()
    const resumed = await new Promise<boolean>((done) => {
      found.addEventListener('helix-dismiss', () => done(true))
      setTimeout(() => done(false), 400)
    })
    expect(resumed).toBe(true)
  })

  test('a removed item stops its own clock', async () => {
    const found = await item('duration="40"')
    let asked = false
    found.addEventListener('helix-dismiss', () => {
      asked = true
    })
    found.remove()
    await new Promise((done) => setTimeout(done, 200))
    expect(asked).toBe(false)
  })
})

describe('the stack and the top layer', () => {
  test('is a manual popover, so it can sit above a dialog opened after it', async () => {
    const region = await mount(
      `<helix-headless-toast><helix-headless-toast-item>Saved</helix-headless-toast-item></helix-headless-toast>`,
    )
    expect(region.shadowRoot?.querySelector('[part="region"]')?.getAttribute('popover')).toBe(
      'manual',
    )
  })

  /* Only where the browser has the popover API; happy-dom does not show one. */
  test('shows while a message shows, and goes once none is left', async () => {
    const region = (await mount(
      `<helix-headless-toast><helix-headless-toast-item>Saved</helix-headless-toast-item></helix-headless-toast>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    const stack = region.shadowRoot?.querySelector('[part="region"]') as HTMLElement
    if (typeof stack.showPopover !== 'function') {
      return
    }
    await region.updateComplete
    const shown = stack.matches(':popover-open')
    const item = region.querySelector('helix-headless-toast-item') as Item
    item.dismiss()
    await item.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect([shown, stack.matches(':popover-open')]).toEqual([true, false])
  })
})

describe('focus when a message goes', () => {
  /* The dismiss control had focus and went with its message, so focus fell to
     the body. It moves to the next message, as it does in React Aria. */
  test('moves to the next message', async () => {
    const region = (await mount(
      `<helix-headless-toast>
        <helix-headless-toast-item id="one" dismissible>One</helix-headless-toast-item>
        <helix-headless-toast-item id="two" dismissible>Two</helix-headless-toast-item>
      </helix-headless-toast>`,
    )) as HTMLElement
    const [one, two] = [...region.querySelectorAll('helix-headless-toast-item')] as Item[]
    await one?.updateComplete
    await two?.updateComplete
    const dismiss = one?.shadowRoot?.querySelector<HTMLElement>('[part="dismiss"]')
    dismiss?.focus()
    dismiss?.click()
    await one?.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(two?.shadowRoot?.activeElement?.getAttribute('part')).toBe('dismiss')
  })
})

describe('the hotkey', () => {
  const key = (init: KeyboardEventInit): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
    document.dispatchEvent(event)
    return event
  }

  /* The way back is read through the shadow roots' `activeElement`, which
     happy-dom cannot answer for an element focused inside one, so it is
     checked in Chromium. */
  test('takes focus to the first control in the stack', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const host = await region(
      '<helix-headless-toast-item dismissible>Saved</helix-headless-toast-item>',
    )
    const item = host.querySelector('helix-headless-toast-item') as Item
    await item.updateComplete
    /* Watched, and not read back: happy-dom's `activeElement` on a shadow
       root throws for an element focused inside it. */
    const dismiss = item.shadowRoot?.querySelector('[part="dismiss"]') as HTMLElement
    let focused = 0
    dismiss.addEventListener('focus', () => {
      focused += 1
    })
    expect(key({ key: 'F8' }).defaultPrevented).toBe(true)
    expect(focused).toBe(1)
    opener.remove()
  })

  test('does nothing with nothing showing, or for another key', async () => {
    await region()
    expect(key({ key: 'F8' }).defaultPrevented).toBe(false)
    expect(key({ ctrlKey: true, key: 'F8' }).defaultPrevented).toBe(false)
  })
})

describe('add()', () => {
  test('shows a message of the region’s tier from script, and removes it once dismissed', async () => {
    const host = (await region()) as HTMLElement & {
      add(message: string, options?: { tone?: string }): Item
    }
    const item = host.add('Saved', { tone: 'success' })
    await item.updateComplete
    expect(item.localName).toBe('helix-headless-toast-item')
    expect(item.textContent).toBe('Saved')
    expect(item.getAttribute('tone')).toBe('success')
    expect(item.hasAttribute('dismissible')).toBe(true)
    item.dismiss()
    await item.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(item.isConnected).toBe(false)
  })

  test('takes a heading, which names the message, and puts the message under it', async () => {
    const host = (await region()) as HTMLElement & {
      add(message: string, options?: { heading?: string }): Item
    }
    const item = host.add('The file is larger than 10 MB.', { heading: 'Upload failed' })
    await item.updateComplete
    expect(item.querySelector('[slot="heading"]')?.textContent).toBe('Upload failed')
    expect(item.querySelector('[slot="description"]')?.textContent).toBe(
      'The file is larger than 10 MB.',
    )
  })

  test('takes an action, which goes in the message’s actions slot', async () => {
    const host = (await region()) as HTMLElement & {
      add(message: string, options?: { action?: Element }): Item
    }
    const undo = document.createElement('button')
    undo.textContent = 'Undo'
    const item = host.add('Deleted', { action: undo })
    expect(undo.parentElement).toBe(item)
    expect(undo.getAttribute('slot')).toBe('actions')
    expect(item.firstChild?.textContent).toBe('Deleted')
  })

  test('never removes a message the page rendered itself', async () => {
    const host = await region('<helix-headless-toast-item>Mine</helix-headless-toast-item>')
    const item = host.querySelector('helix-headless-toast-item') as Item
    item.dismiss()
    await item.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(item.isConnected).toBe(true)
  })
})
