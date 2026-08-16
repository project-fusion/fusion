import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & {
  dismiss(): boolean
  duration?: number
  pause(): void
  resume(): void
  updateComplete: Promise<boolean>
}

const region = async (items = ''): Promise<HTMLElement> =>
  (await mount(`<helix-toast label="Notifications">${items}</helix-toast>`)) as HTMLElement

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
    const host = await region(`<helix-toast-item ${attrs}>Saved</helix-toast-item>`)
    const found = host.querySelector('helix-toast-item') as Item
    await found.updateComplete
    return found
  }

  test('asking to go is an event, and the item does not remove itself', async () => {
    /* The consumer owns the list. An item that took itself out would leave the
       two disagreeing about what is on screen. */
    const found = await item('dismissible')
    let seen = ''
    found.addEventListener('helix-dismiss', (event) => {
      seen = (event as CustomEvent<{ label: string }>).detail.label
    })
    expect(found.dismiss()).toBe(true)
    expect(seen).toBe('Saved')
    expect(found.isConnected).toBe(true)
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
      setTimeout(() => done(false), 300)
    })
    expect(asked).toBe(true)
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

if (hasLayout()) {
  describe('toast stacking', () => {
    /* Which flex direction puts a new message nearest the edge depends on the
       edge, and it is the reverse of what the property name suggests:
       `column-reverse` puts the *first* item at main-start, so at the bottom it
       puts the newest furthest from the corner. Both readings are plausible,
       this was written the wrong way round first, and only a browser can say
       which is which. */
    const stack = async (placement: string): Promise<{ newest: number; oldest: number }> => {
      const host = (await mount(
        `<helix-toast label="N" placement="${placement}">
          <helix-toast-item>OLDEST</helix-toast-item>
          <helix-toast-item>NEWEST</helix-toast-item>
        </helix-toast>`,
      )) as HTMLElement
      await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
      const items = [...host.querySelectorAll('helix-toast-item')]
      const find = (text: string): number => {
        const found = items.find((item) => item.textContent?.trim() === text)
        if (!found) {
          throw new Error(`the fixture no longer holds ${text}`)
        }
        return found.getBoundingClientRect().top
      }
      return { newest: find('NEWEST'), oldest: find('OLDEST') }
    }

    test('at the bottom, the newest message is the one nearest the edge', async () => {
      const { newest, oldest } = await stack('bottom-end')
      expect(newest).toBeGreaterThan(oldest)
    })

    test('at the top, the newest message is the one nearest that edge instead', async () => {
      const { newest, oldest } = await stack('top-center')
      expect(newest).toBeLessThan(oldest)
    })
  })
}
