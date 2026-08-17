import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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
    await new Promise((done) => setTimeout(done, 250))
    await found.updateComplete
    expect(found.open).toBe(false)
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

  describe('toast item appearance', () => {
    const item = async (attrs = ''): Promise<Item> => {
      const host = await region(`<helix-toast-item ${attrs}>Saved</helix-toast-item>`)
      const found = host.querySelector('helix-toast-item') as Item
      await found.updateComplete
      return found
    }

    test('the timer bar is drawn only where there is a clock to show', async () => {
      /* A message that stays until it is dismissed has nothing to count down,
         and a bar sitting full and still under it would be a progress
         indicator for a process that is not running. */
      expect(part(await item('duration="4000"'), 'timer')).toBeTruthy()
      expect(part(await item(''), 'timer')).toBeNull()
    })

    test('the bar carries the duration, so one clock drives both', async () => {
      // The item already holds the timer. A second one writing a width each
      // frame would be two clocks to keep in step, so the animation is given
      // the duration and the browser runs it.
      const found = await item('duration="4000"')
      const bar = part(found, 'timer') as HTMLElement
      expect(bar.style.getPropertyValue('--_toast-duration')).toBe('4000ms')
      expect(getComputedStyle(bar).animationDuration).toBe('4s')
    })

    test('pausing the clock freezes the bar with it', async () => {
      /* The half that makes the pair honest. Hovering stops the timer, and a
         bar that kept draining would promise the message was about to go while
         it was in fact waiting for the pointer to leave. */
      const found = await item('duration="4000"')
      const bar = part(found, 'timer') as HTMLElement
      expect(getComputedStyle(bar).animationPlayState).toBe('running')

      found.pause()
      await found.updateComplete
      expect(found.hasAttribute('data-paused')).toBe(true)
      expect(getComputedStyle(bar).animationPlayState).toBe('paused')

      found.resume()
      await found.updateComplete
      expect(getComputedStyle(bar).animationPlayState).toBe('running')
    })

    test('the severity is a named icon, not only a colour', async () => {
      /* It was a coloured bar, which says *something* is different about this
         message and never says what. A reader who cannot tell green from red
         was told nothing at all. The glyph carries the name. */
      const found = await item('severity="danger"')
      const glyph = (part(found, 'icon') as HTMLElement).querySelector('svg')
      expect(glyph?.getAttribute('role')).toBe('img')
      expect(glyph?.getAttribute('aria-label')).toBe('Error')
      expect(getComputedStyle(part(found, 'item') as HTMLElement).borderLeftWidth).toBe('0px')
    })

    test('each severity names itself, in the same words `Callout` uses', async () => {
      // One vocabulary, met in a passage and in a message. Two would be two.
      for (const [severity, name] of [
        ['info', 'Information'],
        ['success', 'Success'],
        ['warning', 'Warning'],
        ['danger', 'Error'],
      ]) {
        const found = await item(`severity="${severity}"`)
        const glyph = (part(found, 'icon') as HTMLElement).querySelector('svg')
        expect(glyph?.getAttribute('aria-label'), severity).toBe(name)
      }
    })

    test('no severity means no mark at all', async () => {
      /* The common message. "Project saved" is not an error, a warning or an
         announcement, and an icon there would be decoration standing where
         meaning is supposed to be. `Callout` falls back to `info` because it is
         always *about* something; a toast is the next thing that happened. */
      expect(part(await item(''), 'icon')).toBeNull()
    })

    test('the dismiss glyph has its own slot name, because two cannot share one', async () => {
      /* Assignment goes to whichever slot comes first in the tree, so the
         severity mark would have swallowed anything meant for the control. */
      const found = await item('dismissible severity="info"')
      expect(part(found, 'dismiss')?.querySelector('slot')?.getAttribute('name')).toBe(
        'dismiss-icon',
      )
      expect((part(found, 'icon') as HTMLElement).querySelector('slot')?.getAttribute('name')).toBe(
        'icon',
      )
    })

    test('a message is the opposite of what it is sitting on', async () => {
      /* Inverted by default. A flip of `color-scheme` rather than a named
         inverse surface, so every token in the subtree re-resolves and anything
         slotted in comes out right.
       *
       * Both in one mount, because `mount` assigns `document.body.innerHTML`:
       * mounting the second detaches the first, and `getComputedStyle` on a
       * detached element returns empty strings for everything. */
      const host = (await mount(
        `<div>
           <div data-color-mode="light">
             <helix-toast id="over-light" label="N">
               <helix-toast-item severity="info">m</helix-toast-item>
             </helix-toast>
           </div>
           <div data-color-mode="dark">
             <helix-toast id="over-dark" label="N">
               <helix-toast-item severity="info">m</helix-toast-item>
             </helix-toast>
           </div>
         </div>`,
      )) as HTMLElement
      const scheme = (id: string): string =>
        getComputedStyle(host.querySelector(`#${id}`) as HTMLElement).colorScheme

      expect(scheme('over-light')).toBe('dark')
      expect(scheme('over-dark')).toBe('light')
    })

    test('the nearest region decides, which is why it reads an inherited value', async () => {
      /* A light preview inside a dark page is the case that rules this out
         being a media query and two descendant selectors: those cannot say
         "the nearest ancestor that set the mode", so the toast would take the
         page's answer and invert the wrong way. A custom property inherits,
         which is that rule for free. */
      const host = (await mount(
        `<div data-color-mode="dark"><div data-color-mode="light">
           <helix-toast label="N"><helix-toast-item severity="info">m</helix-toast-item></helix-toast>
         </div></div>`,
      )) as HTMLElement
      const toast = host.querySelector('helix-toast') as HTMLElement
      expect(getComputedStyle(toast).colorScheme).toBe('dark')
    })

    test('a region carrying its own mode takes that instead of inverting', async () => {
      const host = (await mount(
        `<div data-color-mode="dark">
           <helix-toast data-color-mode="dark" label="N">
             <helix-toast-item severity="info">m</helix-toast-item>
           </helix-toast>
         </div>`,
      )) as HTMLElement
      const toast = host.querySelector('helix-toast') as HTMLElement
      expect(getComputedStyle(toast).colorScheme).toBe('dark')
    })

    test('a toast is dense, so its controls are one height', async () => {
      /* Measured before this: the text, the action and the dismiss were at 654,
         664 and 660, because `start` aligned three boxes of different heights
         by their tops. The heights differ because a toast is dense by nature
         and had never said so. */
      const found = (await mount(
        `<helix-toast label="N"><helix-toast-item dismissible>Message
           <helix-button appearance="tertiary" slot="actions">Retry</helix-button>
         </helix-toast-item></helix-toast>`,
      )) as HTMLElement
      const found_item = found.querySelector('helix-toast-item') as Item
      await found_item.updateComplete
      const action = found.querySelector('helix-button') as HTMLElement
      const dismiss = part(found_item, 'dismiss') as HTMLElement
      const middle = (element: HTMLElement): number => {
        const box = element.getBoundingClientRect()
        return Math.round(box.top + box.height / 2)
      }
      /* The centres no longer agree, and should not: the action sits on its own
         row now. What this was really written for is the heights, which is the
         fault it caught. A toast is dense by nature and had never said so, so a
         slotted control came out at the full 40px beside a 32px dismiss. */
      expect(Math.round(action.getBoundingClientRect().height)).toBe(
        Math.round(dismiss.getBoundingClientRect().height),
      )
      expect(Math.round(action.getBoundingClientRect().height)).toBe(32)
      void middle
    })

    test('the mark and the close sit on the first line, the action on its own row', async () => {
      /* Not centred, which floated them to the middle of a long message, and
         not plain `start`, which is what an earlier version of this row did:
         boxes of 16px, 21px and 32px sharing a top edge have centres 8px apart,
         so a one-line message came out staggered. Each is offset by half the
         difference between the line and itself, so one line reproduces centring
         exactly and four leave everything where the reading starts.
       *
         The close needed its offset written *inside* its own rule: `all: unset`
         there wipes a margin set earlier, the same way it wipes `box-sizing`,
         and it sat 5.5px low until this was measured. */
      const host = (await mount(
        `<helix-toast label="N">
           <helix-toast-item id="short" dismissible severity="danger">Short.
             <helix-button appearance="tertiary" slot="actions">Retry</helix-button>
           </helix-toast-item>
           <helix-toast-item id="long" dismissible severity="danger">A far longer
             message that wraps onto several separate lines inside the width a
             toast is given, which is where the alignment question bites.
             <helix-button appearance="tertiary" slot="actions">Retry</helix-button>
           </helix-toast-item>
         </helix-toast>`,
      )) as HTMLElement

      for (const id of ['short', 'long']) {
        const found = host.querySelector(`#${id}`) as Item
        await found.updateComplete
        const centre = (element: Element): number => {
          const box = element.getBoundingClientRect()
          return box.top + box.height / 2
        }
        const icon = centre(part(found, 'icon') as HTMLElement)
        expect(Math.abs(centre(part(found, 'dismiss') as HTMLElement) - icon)).toBeLessThan(2)

        /* The action is deliberately not on that line. Inline it was right for
           "Project saved. [Undo]" and wrong the moment the message wraps:
           pinned to the first line it floats up beside the close and competes
           with it for the corner. Below the message it sits where the reading
           finishes, at any length. */
        const action = found.querySelector('helix-button') as HTMLElement
        const content = part(found, 'content') as HTMLElement
        expect(action.getBoundingClientRect().top).toBeGreaterThan(
          content.getBoundingClientRect().bottom - 2,
        )
      }
    })

    test('the arrival holds its starting state through a delay', async () => {
      /* `backwards` on the entry animation. Without it a stack given staggered
         delays paints in full and each message jumps back to invisible when its
         turn comes, which is the opposite of arriving. */
      const found = await item('severity="info"')
      expect(getComputedStyle(part(found, 'item') as HTMLElement).animationFillMode).toBe(
        'backwards',
      )
    })
  })

  describe('the clock and what holds it', () => {
    const item = async (attrs = ''): Promise<Item> => {
      const host = await region(`<helix-toast-item ${attrs}>Saved</helix-toast-item>`)
      const found = host.querySelector('helix-toast-item') as Item
      await found.updateComplete
      return found
    }

    test('the region is not atomic, so an arrival is not the whole stack', async () => {
      /* `role="status"` implies `aria-atomic="true"`, which re-reads the entire
         region whenever any part of it changes: with four messages up, the
         fifth announces all five. `aria-relevant="additions"` does not help,
         because it says which mutations count and not how much is read when one
         does. Both are needed and only one was set. */
      const host = await region()
      expect((host as unknown as { internals?: ElementInternals }).internals?.ariaAtomic).toBe(
        'false',
      )
    })

    test('two reasons to hold the clock take two releases', async () => {
      /* Hover and focus stopped the same timer with nothing counting them, so a
         reader who tabbed into a message and then moved the pointer away had it
         restarted underneath them. That is the case the pause is for. */
      const found = await item('duration="4000"')
      const bar = part(found, 'timer') as HTMLElement
      const frozen = (): boolean => getComputedStyle(bar).animationPlayState === 'paused'
      /* On the surface, not the host. The listeners are bound in the template
         and `mouseenter` does not bubble, so a press dispatched at the host
         reaches nothing. */
      const surface = part(found, 'item') as HTMLElement

      surface.dispatchEvent(new MouseEvent('mouseenter'))
      surface.dispatchEvent(new FocusEvent('focusin'))
      await found.updateComplete
      expect(frozen()).toBe(true)

      // The pointer leaves; focus has not.
      surface.dispatchEvent(new MouseEvent('mouseleave'))
      await found.updateComplete
      expect(frozen()).toBe(true)

      surface.dispatchEvent(new FocusEvent('focusout'))
      await found.updateComplete
      expect(frozen()).toBe(false)
    })
  })
}
