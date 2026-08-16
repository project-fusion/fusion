import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

/* happy-dom before the element, and the import dynamic for it: an element
   registered against the `customElements` happy-dom replaces never upgrades. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
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
    `<helix-dialog label="Delete project" ${extra}>
      <h2 slot="header">Delete project</h2>
      This cannot be undone.
    </helix-dialog>`,
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
