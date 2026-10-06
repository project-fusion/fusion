import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  /* And Button, which one of these slots into `actions` and measures against
     the dismiss. A spec that mounts another family has to import it for the
     same reason a component does: the sandbox and the docs site pull the whole
     barrel, so an unregistered element is invisible everywhere except here.
     Unimported it is an unknown inline element, and the height that comes back
     is the line box, 20px against the 32 this asserts. */
  await import('../../button/index.js')
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

/* Stacking, the timer bar, the severity marks and the inversion, all of which
   this tier draws. The behavior is the headless element's and is tested there. */
if (hasLayout()) {
  describe('toast stacking', () => {
    /* Which flex direction puts a new message nearest the edge depends on the
       edge, and it is the reverse of what the property name suggests:
       `column-reverse` puts the *first* item at main-start, so at the bottom it
       puts the newest furthest from the corner. Both readings are plausible and
       only a browser can say which is which. */
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
      expect(bar.style.getPropertyValue('--toast-duration')).toBe('4000ms')
      expect(getComputedStyle(bar).animationDuration).toBe('4s')
    })

    test("the bar is the message's own top edge, not a stripe laid on it", async () => {
      /* **Nothing but the pair below holds it there**, which is why it is worth
         a spec: the surface is the bar's containing block and also what clips
         it, so a `position: static` or a lost `overflow` would leave the bar
         floating against the region while every other assertion here passed.
         The ends take the corner radius from the clip rather than standing
         square against it, and the radius is the bar's own height, so the corner
         of a message with a clock on it is drawn in the tone.

         `offset*` and not a client rect: the drain is running by now and a
         `scale` shows up in a rect, so the box this asks about would be however
         far the animation had got. */
      const found = await item('duration="4000"')
      const surface = part(found, 'item') as HTMLElement
      const bar = part(found, 'timer') as HTMLElement

      expect(getComputedStyle(surface).position).toBe('relative')
      expect(getComputedStyle(surface).overflow).toBe('hidden')
      expect(bar.offsetParent).toBe(surface)
      expect(bar.offsetTop).toBe(0)
      expect(bar.offsetLeft).toBe(0)
      expect(bar.offsetWidth).toBe(surface.clientWidth)
      // `space-2xs`, and the same 4px as `radii-sm` above it.
      expect(bar.offsetHeight).toBe(4)
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

    test('the tone is a named icon, not only a color', async () => {
      /* A colored bar says *something* is different about this message and
         never says what, so a reader who cannot tell green from red is told
         nothing at all. The glyph carries the name. */
      const found = await item('tone="danger"')
      const glyph = (part(found, 'icon') as HTMLElement).querySelector('svg')
      expect(glyph?.getAttribute('role')).toBe('img')
      expect(glyph?.getAttribute('aria-label')).toBe('Error')
      expect(getComputedStyle(part(found, 'item') as HTMLElement).borderLeftWidth).toBe('0px')
    })

    test('each tone names itself, in the same words `Callout` uses', async () => {
      // One vocabulary, met in a passage and in a message. Two would be two.
      for (const [tone, name] of [
        ['info', 'Information'],
        ['success', 'Success'],
        ['warning', 'Warning'],
        ['danger', 'Error'],
      ]) {
        const found = await item(`tone="${tone}"`)
        const glyph = (part(found, 'icon') as HTMLElement).querySelector('svg')
        expect(glyph?.getAttribute('aria-label'), tone).toBe(name)
      }
    })

    test('no tone means no mark at all', async () => {
      /* The common message. "Project saved" is not an error, a warning or an
         announcement, and an icon there would be decoration standing where
         meaning is supposed to be. `Callout` falls back to `info` because it is
         always *about* something; a toast is the next thing that happened. */
      expect(part(await item(''), 'icon')).toBeNull()
    })

    test('the dismiss glyph has its own slot name, because two cannot share one', async () => {
      /* Assignment goes to whichever slot comes first in the tree, so the
         severity mark would have swallowed anything meant for the control. */
      const found = await item('dismissible tone="info"')
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
               <helix-toast-item tone="info">m</helix-toast-item>
             </helix-toast>
           </div>
           <div data-color-mode="dark">
             <helix-toast id="over-dark" label="N">
               <helix-toast-item tone="info">m</helix-toast-item>
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
           <helix-toast label="N"><helix-toast-item tone="info">m</helix-toast-item></helix-toast>
         </div></div>`,
      )) as HTMLElement
      const toast = host.querySelector('helix-toast') as HTMLElement
      expect(getComputedStyle(toast).colorScheme).toBe('dark')
    })

    test('a region carrying its own mode takes that instead of inverting', async () => {
      const host = (await mount(
        `<div data-color-mode="dark">
           <helix-toast data-color-mode="dark" label="N">
             <helix-toast-item tone="info">m</helix-toast-item>
           </helix-toast>
         </div>`,
      )) as HTMLElement
      const toast = host.querySelector('helix-toast') as HTMLElement
      expect(getComputedStyle(toast).colorScheme).toBe('dark')
    })

    /* Each visual decision is a hook named after the family, resting on the
       value it replaced, so setting none of them draws what was drawn. */
    test('every hook rests on the value it replaced, and a page moves it', async () => {
      const host = (await mount(
        `<helix-toast label="N"><helix-toast-item tone="danger" dismissible duration="9000">
           <span slot="heading">Saved</span><span slot="description">Kept</span>
         </helix-toast-item></helix-toast>`,
      )) as HTMLElement
      const item = host.querySelector('helix-toast-item') as Item
      await item.updateComplete
      const look = (): string[] => {
        const box = getComputedStyle(part(item, 'item') as HTMLElement)
        const heading = getComputedStyle(item.querySelector('[slot="heading"]') as HTMLElement)
        const detail = getComputedStyle(item.querySelector('[slot="description"]') as HTMLElement)
        const timer = getComputedStyle(part(item, 'timer') as HTMLElement)
        return [
          box.backgroundColor,
          box.borderTopLeftRadius,
          box.color,
          box.fontSize,
          heading.fontWeight,
          detail.color,
          getComputedStyle(part(item, 'dismiss') as HTMLElement).color,
          getComputedStyle(part(item, 'icon') as HTMLElement).color,
          timer.backgroundColor,
          timer.height,
        ]
      }
      const before = look()
      for (const [name, value] of [
        ['--toast-background', 'rgb(1, 1, 1)'],
        ['--toast-radius', '9px'],
        ['--toast-color', 'rgb(2, 2, 2)'],
        ['--toast-font-size', '19px'],
        ['--toast-heading-weight', '300'],
        ['--toast-description-color', 'rgb(3, 3, 3)'],
        ['--toast-dismiss-color', 'rgb(4, 4, 4)'],
        ['--toast-tone-color', 'rgb(5, 5, 5)'],
        ['--toast-timer-size', '7px'],
      ] as const) {
        item.style.setProperty(name, value)
      }
      expect(look()).toEqual([
        'rgb(1, 1, 1)',
        '9px',
        'rgb(2, 2, 2)',
        '19px',
        '300',
        'rgb(3, 3, 3)',
        'rgb(4, 4, 4)',
        'rgb(5, 5, 5)',
        'rgb(5, 5, 5)',
        '7px',
      ])
      item.removeAttribute('style')
      expect(look()).toEqual(before)
    })

    test('a toast is dense, so its controls are one height', async () => {
      /* A toast is dense by nature, so a control slotted into one has to come
         out at the dense height rather than the full one. */
      const found = (await mount(
        `<helix-toast label="N"><helix-toast-item dismissible>Message
           <helix-button emphasis="ghost" slot="actions">Retry</helix-button>
         </helix-toast-item></helix-toast>`,
      )) as HTMLElement
      const found_item = found.querySelector('helix-toast-item') as Item
      await found_item.updateComplete
      const action = found.querySelector('helix-button') as HTMLElement
      const dismiss = part(found_item, 'dismiss') as HTMLElement
      /* Heights, not centers: the action sits on a row of its own, so the
         centers do not agree and should not. Without the density a slotted
         control comes out at the full 40px beside a 32px dismiss. */
      expect(Math.round(action.getBoundingClientRect().height)).toBe(
        Math.round(dismiss.getBoundingClientRect().height),
      )
      expect(Math.round(action.getBoundingClientRect().height)).toBe(32)
    })

    test('the mark and the close hold the first line, and the action sits under the words', async () => {
      /* Not centered, which floats them to the middle of a long message, and not
         plain `start`: boxes of 16px, 21px and 32px sharing a top edge have
         centers 8px apart, so a one-line message comes out staggered. Each is
         offset by half the difference between the line and itself, so one line
         reproduces centering exactly and four leave everything where the
         reading starts.
       *
         The close needed its offset written *inside* its own rule: `all: unset`
         there wipes a margin set earlier, the same way it wipes `box-sizing`,
         and it sat 5.5px low until this was measured. */
      const host = (await mount(
        `<helix-toast label="N">
           <helix-toast-item id="short" dismissible tone="danger">Short.
             <helix-button emphasis="ghost" slot="actions">Retry</helix-button>
           </helix-toast-item>
           <helix-toast-item id="long" dismissible tone="danger">A far longer
             message that wraps onto several separate lines inside the width a
             toast is given, which is where the alignment question bites.
             <helix-button emphasis="ghost" slot="actions">Retry</helix-button>
           </helix-toast-item>
         </helix-toast>`,
      )) as HTMLElement

      for (const id of ['short', 'long'] as const) {
        const found = host.querySelector(`#${id}`) as Item
        await found.updateComplete
        const center = (element: Element): number => {
          const box = element.getBoundingClientRect()
          return box.top + box.height / 2
        }
        const icon = center(part(found, 'icon') as HTMLElement)
        expect(Math.abs(center(part(found, 'dismiss') as HTMLElement) - icon)).toBeLessThan(2)

        /* The action gets a row of its own, in the message's column, at every
           message length: an action is a thing to do about the message, so it
           belongs under the words rather than beside them or under the mark.
           Never beside a short message, which is what a wrapping flex gives. */
        const action = found.querySelector('helix-button') as HTMLElement
        const content = part(found, 'content') as HTMLElement
        const actionBox = action.getBoundingClientRect()
        const contentBox = content.getBoundingClientRect()
        expect(actionBox.top).toBeGreaterThan(contentBox.top)
        expect(Math.abs(actionBox.left - contentBox.left)).toBeLessThan(2)
      }
    })

    test('the arrival holds its starting state through a delay', async () => {
      /* `backwards` on the entry animation. Without it a stack given staggered
         delays paints in full and each message jumps back to invisible when its
         turn comes, which is the opposite of arriving. */
      const found = await item('tone="info"')
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

    test('the stack is not a live region, so an arrival is not the whole stack', async () => {
      /* A live stack re-read itself, or a danger message inside it, when a
         message arrived. The `live` parts say the one that arrived. */
      const host = await region()
      expect(
        (host as unknown as { internals?: ElementInternals }).internals?.ariaLive ?? null,
      ).toBeNull()
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

describe('a message made by add()', () => {
  test('is this tier’s message, so it is drawn like a rendered one', async () => {
    const host = (await region()) as HTMLElement & {
      add(message: string, options?: { tone?: string }): HTMLElement
    }
    const added = host.add('Added', { tone: 'info' })
    expect(added.localName).toBe('helix-toast-item')
  })
})
