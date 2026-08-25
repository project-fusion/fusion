import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

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
 * **A fixed sleep of 250ms was six times the duration and still lost.** These
 * two failed on runners and nowhere else, and a margin chosen against a laptop
 * is not a margin: a loaded runner throttles timers, and the clock these assert
 * is also one hover or focus away from being held deliberately. Waiting on the
 * outcome rather than on a stopwatch costs nothing when it passes, which is
 * almost always, and stops guessing at a number that has already been wrong.
 */
const LATEST = 2000

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
 * **`expect(value, message)` drops the message under bun**, which cost a CI
 * round trip that reported `expected true to be false` and nothing else. What
 * is needed is whether the clock was stopped on purpose: a timer that did not
 * fire and a timer that was deliberately held are different faults, and the
 * pause on hover and focus is exactly what makes the second one possible.
 * Folding it into the compared value is the only form bun prints.
 */
const state = (found: Item): string =>
  `open=${found.open} paused=${found.hasAttribute('data-paused')}`

const region = async (items = ''): Promise<HTMLElement> =>
  (await mount(
    `<helix-headless-toast label="Notifications">${items}</helix-headless-toast>`,
  )) as HTMLElement

describe('toast region', () => {
  test('is a polite live region, never an assertive one', async () => {
    /* `role="alert"` interrupts whatever a reader is being told, and almost
       nothing arriving in a corner of the screen has earned that. */
    const host = await region()
    const internals = (host as unknown as { internals?: ElementInternals }).internals
    expect(internals?.role).toBe('status')
    expect(internals?.ariaLive).toBe('polite')
  })

  test('announces arrivals and says nothing when one goes', async () => {
    // A dismissal read aloud is every removal narrated.
    const host = await region()
    expect((host as unknown as { internals?: ElementInternals }).internals?.ariaRelevant).toBe(
      'additions',
    )
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
    /* Two halves, and they used to be one. The message hides itself, which is
       what every other stateful thing here does when nothing has claimed it,
       and it stays in the DOM, because the consumer owns the list and a node
       removed under a framework would be put straight back. */
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
    expect(found.hasAttribute('data-open')).toBe(false)
    expect(found.isConnected).toBe(true)
  })

  test('a declared `open` belongs to the consumer, and dismissing only asks', async () => {
    /* The exception this component used to be: it waited to be told in every
       case, so `duration` did nothing without consumer script and the control
       looked broken. Now only a consumer who said the state is theirs gets
       that, which is the contract everywhere else. */
    const found = await item('dismissible open')
    let asked = false
    found.addEventListener('helix-dismiss', () => {
      asked = true
    })
    found.dismiss()
    await found.updateComplete
    expect(asked).toBe(true)
    expect(found.open).toBe(true)

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
