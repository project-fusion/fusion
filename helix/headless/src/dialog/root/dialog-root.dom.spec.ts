import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

/* happy-dom before the element, and the import dynamic for it: an element
   registered against the `customElements` happy-dom replaces never upgrades. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The button too: what is being asserted below is the pair, and a trigger
  // that never upgrades is a trigger that cannot command anything.
  await import('../../button/index.js')
})

type Dialog = HTMLElement & {
  close(): void
  open: boolean
  persistent: boolean
  show(): void
  updateComplete: Promise<boolean>
}

const dialog = async (extra = ''): Promise<Dialog> =>
  (await mount(
    `<helix-base-dialog label="Delete project" ${extra}>
      <h2 slot="header">Delete project</h2>
      This cannot be undone.
    </helix-base-dialog>`,
  )) as Dialog

describe('dialog', () => {
  test('it renders a real dialog element, not a div with a role', async () => {
    /* The whole design rests on this: the top layer, the backdrop, Escape and
       inert-behind are the platform's, and none of them are available to a div
       however it is labelled. */
    const host = await dialog()
    expect((part(host, 'dialog') as HTMLElement).tagName.toLowerCase()).toBe('dialog')
  })

  test('the name is on the host through internals, not as an attribute', async () => {
    const host = await dialog()
    expect(host.hasAttribute('aria-label')).toBe(false)
    expect((host as unknown as { internals?: ElementInternals }).internals?.ariaLabel).toBe(
      'Delete project',
    )
  })

  test('opening is announced before it happens, so it can be refused', async () => {
    const host = await dialog()
    host.addEventListener('helix-open', (event) => event.preventDefault())
    host.show()
    await host.updateComplete
    expect(host.hasAttribute('data-open')).toBe(false)
  })

  test('closing is announced too, and refusing it leaves the dialog open', async () => {
    const host = await dialog()
    host.show()
    await host.updateComplete
    expect(host.hasAttribute('data-open')).toBe(true)

    host.addEventListener('helix-close', (event) => event.preventDefault())
    host.close()
    await host.updateComplete
    expect(host.hasAttribute('data-open')).toBe(true)
  })

  test('a close that happened anyway is reflected back', async () => {
    /* `<form method="dialog">` closes the element directly and there is no
       event to prevent. The state follows rather than fights: a dialog that is
       shut while the host still says open cannot be reopened, because
       `showModal()` is never called again. */
    const host = await dialog()
    host.show()
    await host.updateComplete
    const native = part(host, 'dialog') as HTMLDialogElement
    native.dispatchEvent(new Event('close'))
    await host.updateComplete
    expect(host.hasAttribute('data-open')).toBe(false)
  })

  test('escape asks rather than acts, and persistent refuses it', async () => {
    const host = await dialog('persistent')
    host.show()
    await host.updateComplete
    const native = part(host, 'dialog') as HTMLDialogElement
    const cancel = new Event('cancel', { cancelable: true })
    native.dispatchEvent(cancel)
    await host.updateComplete
    expect(cancel.defaultPrevented).toBe(true)
    expect(host.hasAttribute('data-open')).toBe(true)
  })
})

describe('dialog invokers', () => {
  const wired = async (): Promise<{ dialog: Dialog; trigger: HTMLElement }> => {
    const trigger = (await mount(
      `<helix-base-button command="--show" commandfor="confirm">Delete</helix-base-button>
       <helix-base-dialog id="confirm" label="Delete project">Body</helix-base-dialog>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    const dialog = trigger.nextElementSibling as Dialog
    await trigger.updateComplete
    await dialog.updateComplete
    return { dialog, trigger }
  }

  /* The inner control, because that is what a reader's pointer lands on: the
     host has no activation behavior of its own, and a click dispatched at it
     runs none. Measured, and it is the difference between this spec meaning
     something and this spec passing on a button nobody can press. */
  const press = (trigger: HTMLElement): void => {
    const inner = trigger.shadowRoot?.querySelector('button')
    if (!inner) {
      throw new Error('the trigger rendered no button, so there is nothing to press')
    }
    inner.click()
  }

  test('a button opens it, whether or not the browser has invokers', async () => {
    /* This is the one that matters, and it is the same assertion in both
       environments by design. Chromium runs it through the platform's own
       invoker; happy-dom has no `commandForElement` at all, so it runs it
       through the fallback. Before the fallback existed, every `command` in the
       library was dead in any browser older than Chrome 135, Firefox 137 or
       Safari 18.4, and dead in the quietest possible way: right markup, right
       component, and a button that did nothing when pressed. */
    const { dialog, trigger } = await wired()
    press(trigger)
    await dialog.updateComplete
    expect(dialog.hasAttribute('data-open')).toBe(true)
  })

  test('exactly one command arrives, so the two paths never both fire', async () => {
    /* The failure this guards is only visible where things work. If the button
       sent its own event *and* the platform sent one, a browser with invokers
       would open the dialog and immediately toggle it shut, and every browser
       without them would look fine. */
    const { dialog, trigger } = await wired()
    const seen: string[] = []
    dialog.addEventListener('command', (event) => {
      seen.push((event as Event & { command: string }).command)
    })
    press(trigger)
    await dialog.updateComplete
    expect(seen).toEqual(['--show'])
  })

  test('a command naming nothing reaches nothing', async () => {
    /* Both halves, and they say different things. `not.toThrow` is that the
       press survived; the attribute after it is that it did nothing. A press
       that threw would fail this test either way, which is why the second
       assertion was carrying the meaning alone while the harness had no
       `toThrow` to write the first with. */
    const { dialog, trigger } = await wired()
    trigger.setAttribute('commandfor', 'absent')
    await (trigger as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(() => press(trigger)).not.toThrow()
    await dialog.updateComplete
    expect(dialog.hasAttribute('data-open')).toBe(false)
  })
})

if (hasLayout()) {
  describe('dialog geometry', () => {
    test('a closed dialog paints nothing', async () => {
      /* Every other spec in this file asserts state, and state was correct
         while the dialog sat open on the screen: the host said closed, the
         native element had no `open`, and it rendered anyway, because the
         panel's own `display: flex` outranks the UA rule that hides it. Origin
         beats specificity, so nothing about the declaration looks wrong and
         nothing reports it.

         Only a browser can answer this. happy-dom has no layout and no UA
         stylesheet, so a closed dialog measures zero there whether or not the
         bug is present, and the check would pass on the broken build. */
      const host = await dialog()
      expect((part(host, 'dialog') as HTMLElement).getBoundingClientRect().height).toBe(0)
    })

    test('an open one does, and is in the top layer', async () => {
      /* The pair matters. Hiding a closed dialog is easy to do so thoroughly
         that an open one is hidden too, and `:modal` is what separates a panel
         that is merely visible from one the platform has actually raised: the
         scrim, Escape and inert-behind all follow from it. */
      const host = await dialog()
      host.show()
      await host.updateComplete
      const native = part(host, 'dialog') as HTMLDialogElement
      expect(native.getBoundingClientRect().height).toBeGreaterThan(0)
      expect(native.matches(':modal')).toBe(true)
      host.close()
    })
  })
}

describe('dialog framing', () => {
  const framed = async (extra = ''): Promise<Dialog> =>
    (await mount(
      `<helix-base-dialog label="Discard changes" ${extra}>
        <span slot="icon">!</span>
        <h2 slot="header">Discard changes?</h2>
        Nine edits have not been saved.
        <span slot="footer">actions</span>
      </helix-base-dialog>`,
    )) as Dialog

  test('the mark sits above the title, in its own slot', async () => {
    // Its own, rather than something a consumer nests in the header: slotted
    // into a heading it is an icon at a heading's scale, and every product
    // would pick a different one. The dialog owns how big a mark is.
    const host = await framed()
    const slots = [...(host.shadowRoot?.querySelectorAll('slot') ?? [])].map((one) =>
      one.getAttribute('name'),
    )
    expect(slots).toEqual(['icon', 'header', null, 'footer'])
  })

  test('and a dialog with no mark has no empty band where one is not', async () => {
    // Bare, like the header and the footer. An unassigned slot generates no box.
    const host = await dialog()
    const icon = host.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(icon.assignedNodes().length).toBe(0)
  })

  test('centring is one property for the panel, not one per region', async () => {
    // The regions are never mixed: a dialog that asks a short question centers
    // all four together, and one holding a form runs all four from the start.
    const host = await framed('align="center"')
    expect(host.getAttribute('align')).toBe('center')
  })

  test('unset stays unset, so no default is reflected onto the host', async () => {
    const host = await framed()
    expect(host.hasAttribute('align')).toBe(false)
  })
})
