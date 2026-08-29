import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The button too, because the command tests are about the pair.
  await import('../../button/index.js')
})

type Popover = HTMLElement & {
  hide(): void
  open: boolean
  show(): void
  updateComplete: Promise<boolean>
}

const popover = async (extra = ''): Promise<Popover> =>
  (await mount(
    `<helix-headless-popover label="Details" ${extra}>
      <button slot="trigger">Details</button>
      <span>Body</span>
    </helix-headless-popover>`,
  )) as Popover

describe('popover', () => {
  test('the name is on the panel, which is the thing it names', async () => {
    /* A name needs something to be the name of, and the host carries no role.
       Nothing is written onto the host either way: the panel is inside this
       shadow root and is not part of the tree a consumer rendered. */
    const host = await popover()
    expect(host.hasAttribute('aria-label')).toBe(false)
    const panel = part(host, 'popover')
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.getAttribute('aria-label')).toBe('Details')
  })

  test('opening is announced before it happens, so it can be refused', async () => {
    const host = await popover()
    host.addEventListener('helix-before-open', (event) => event.preventDefault())
    host.show()
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(false)
  })

  test('closing is announced too, and refusing it leaves the panel open', async () => {
    const host = await popover()
    host.show()
    await host.updateComplete

    host.addEventListener('helix-before-close', (event) => event.preventDefault())
    host.hide()
    await host.updateComplete
    expect(hasState(host, 'open')).toBe(true)
  })

  test('a command opens it from a button that is not its trigger', async () => {
    /* The whole point of accepting commands as well as a slotted trigger: the
       thing that opens a panel is often somewhere else entirely, and wiring it
       up should not require the panel to be wrapped around it. */
    const host = (await mount(
      `<helix-headless-button command="--show" commandfor="panel">Open</helix-headless-button>
       <helix-headless-popover id="panel" label="Details"><span>Body</span></helix-headless-popover>`,
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    const target = host.nextElementSibling as Popover
    await host.updateComplete
    await target.updateComplete
    const inner = host.shadowRoot?.querySelector('button')
    if (!inner) {
      throw new Error('the trigger rendered no button, so there is nothing to press')
    }
    inner.click()
    await target.updateComplete
    expect(hasState(target, 'open')).toBe(true)
  })

  test('the panel is hidden while closed and shown while open', async () => {
    const host = await popover()
    expect((part(host, 'popover') as HTMLElement).hasAttribute('hidden')).toBe(true)
    host.show()
    await host.updateComplete
    expect((part(host, 'popover') as HTMLElement).hasAttribute('hidden')).toBe(false)
  })

  test('open at mount serves open, without a click to get there', async () => {
    expect(hasState(await popover('open'), 'open')).toBe(true)
  })
})

if (hasLayout()) {
  describe('popover in a browser', () => {
    test('the trigger opens it, and pressing it again closes it', async () => {
      /* Browser-only, and not for the usual reason: nothing here is measured.
         The listener is on the `<slot>`, which is where it belongs, and a click
         on slotted content reaches it through the flattened tree. happy-dom
         does not implement that propagation, so the listener never fires there
         and the panel never opens. Measured directly with a bare custom
         element: zero hits on a slot listener for a click on its assigned
         button, where every real browser reports one.

         `Menu` binds its trigger the same way and its own specs open it by
         calling `show()`, so nothing there covers the path a reader takes. */
      const host = await popover()
      const trigger = host.querySelector('button') as HTMLElement

      trigger.click()
      await host.updateComplete
      expect(hasState(host, 'open')).toBe(true)

      trigger.click()
      await host.updateComplete
      expect(hasState(host, 'open')).toBe(false)
    })

    test('the panel is in the top layer, which is the reason for all of this', async () => {
      /* `:popover-open` is only true for an element the platform has actually
         raised. A panel that is merely visible would pass every other spec in
         this file and still be clipped by the first ancestor with `overflow`. */
      const host = await popover()
      host.show()
      await host.updateComplete
      expect((part(host, 'popover') as HTMLElement).matches(':popover-open')).toBe(true)
    })
  })
}
