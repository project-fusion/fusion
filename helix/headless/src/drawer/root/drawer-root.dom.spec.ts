import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

type Updatable = HTMLElement & {
  updateComplete: Promise<unknown>
  open: boolean
  requestOpen(next: boolean): void
}

const markup = `
  <helix-headless-drawer label="Examples">
    <helix-headless-button>Inside</helix-headless-button>
  </helix-headless-drawer>`

describe('drawer', () => {
  test('the panel is a real dialog, so the platform owns the modality', async () => {
    /* `showModal()` carries `role="dialog"`, `aria-modal`, `inert`, the scrim,
       the focus trap and Escape dismissal. Writing any of them by hand puts a
       second copy of the state beside the platform's, which can drift from what
       the element actually does. */
    const drawer = await mount(markup)
    const panel = part(drawer, 'panel') as HTMLElement
    expect(panel.tagName).toBe('DIALOG')
    expect(panel.getAttribute('aria-label')).toBe('Examples')
    expect(panel.hasAttribute('role')).toBe(false)
    expect(panel.hasAttribute('aria-modal')).toBe(false)
    expect(part(drawer, 'scrim')).toBeNull()
  })

  test('content stays mounted while closed, and the dialog is what hides it', async () => {
    // Mounted so it is in the served markup and can animate. A shut `<dialog>`
    // is already out of the tab order and the accessibility tree, so no `inert`
    // is needed beside it.
    const drawer = await mount(markup)
    expect((part(drawer, 'panel') as HTMLDialogElement).open).toBe(false)
    expect(drawer.textContent).toContain('Inside')
  })

  test('opening puts it in the top layer', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete

    expect(drawer.open).toBe(true)
    const panel = part(drawer, 'panel') as HTMLDialogElement
    expect(panel.open).toBe(true)
    if (hasLayout()) {
      // The reason for all of this: a modal that is merely visible is still
      // clipped by the first ancestor with `overflow`.
      expect(panel.matches(':modal')).toBe(true)
    }
  })

  test('modal off still reaches the top layer, without the backdrop', async () => {
    /* One decision, not two: `showModal` brings a backdrop, a focus trap and
       `inert` behind it, and `show` brings none of them. Both raise the panel,
       which is what a drawer needs either way. */
    const drawer = (await mount(markup)) as Updatable & { modal: boolean }
    drawer.modal = false
    drawer.requestOpen(true)
    await drawer.updateComplete

    const panel = part(drawer, 'panel') as HTMLDialogElement
    expect(panel.open).toBe(true)
    if (hasLayout()) {
      expect(panel.matches(':modal')).toBe(false)
    }
  })

  test('announces its own open changes, like every other open component', async () => {
    const drawer = (await mount(markup)) as Updatable
    let seen: boolean | null = null
    drawer.addEventListener('helix-before-open', (event) => {
      seen = (event as CustomEvent<{ open: boolean }>).detail.open
    })
    drawer.requestOpen(true)
    expect<boolean | null>(seen).toBe(true)
  })

  test('opening moves focus into the panel', async () => {
    /* Browser-only: `showModal()` is what moves focus, and happy-dom implements
       the method as a no-op, so the only place this can be observed is a
       browser that actually has a top layer. */
    if (!hasLayout()) {
      return
    }
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const inside = drawer.querySelector('helix-headless-button')
    expect(drawer.contains(document.activeElement) || document.activeElement === inside).toBe(true)
  })

  test('Escape closes it, and comes back through the request', async () => {
    /* `cancel` rather than a keydown on the document: Escape belongs to the
       platform, and a native dialog fires `cancel` for it. Intercepted rather
       than left alone, because a dialog left to close itself shuts while the
       consumer's state still says open, which is the bug that makes a modal
       impossible to reopen. */
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete

    const panel = part(drawer, 'panel') as HTMLDialogElement
    panel.dispatchEvent(new Event('cancel', { cancelable: true }))
    await drawer.updateComplete
    expect(drawer.open).toBe(false)
  })

  test('a refused Escape leaves it open', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete

    drawer.addEventListener('helix-before-close', (event) => event.preventDefault())
    ;(part(drawer, 'panel') as HTMLDialogElement).dispatchEvent(
      new Event('cancel', { cancelable: true }),
    )
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
  })
})

describe('a press on the drawer', () => {
  /* The panel is the `<dialog>`, so a press in its own padding has the dialog
     as its target, the same as a press on the backdrop. Only the point says
     which of the two it was. */
  const press = (panel: HTMLElement, x: number, y: number): void => {
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }))
  }

  test('inside the panel’s own box leaves it open', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete
    const panel = part(drawer, 'panel') as HTMLElement
    const box = panel.getBoundingClientRect()
    press(panel, box.left, box.bottom)
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
  })

  test('and on the backdrop beside it closes it', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete
    const panel = part(drawer, 'panel') as HTMLElement
    const box = panel.getBoundingClientRect()
    press(panel, box.left - 10, box.top)
    await drawer.updateComplete
    expect(drawer.open).toBe(false)
  })
})

describe('a drawer that is not modal', () => {
  /* `show()` gives a `<dialog>` no close watcher of its own, so Escape did
     nothing. `closerequest` asks for one, and its `cancel` comes back through
     the request as the modal drawer's does. */
  test('asks the platform for Escape', async () => {
    const drawer = await mount(
      '<helix-headless-drawer label="Side" modal="false">Body</helix-headless-drawer>',
    )
    expect((part(drawer, 'panel') as HTMLElement).getAttribute('closedby')).toBe('closerequest')
  })

  test('unless `closedby` says otherwise, and a modal one leaves it to the platform', async () => {
    const chosen = await mount(
      '<helix-headless-drawer label="Side" modal="false" closedby="any">Body</helix-headless-drawer>',
    )
    const modal = await mount(markup)
    expect([
      (part(chosen, 'panel') as HTMLElement).getAttribute('closedby'),
      (part(modal, 'panel') as HTMLElement).hasAttribute('closedby'),
    ]).toEqual(['any', false])
  })

  test('leaves the page scrolling, where a modal one holds it still', async () => {
    const root = document.documentElement
    const side = (await mount(
      '<helix-headless-drawer label="Side" modal="false">Body</helix-headless-drawer>',
    )) as Updatable
    side.requestOpen(true)
    await side.updateComplete
    const free = root.style.overflow
    side.requestOpen(false)
    await side.updateComplete
    const modal = (await mount(markup)) as Updatable
    modal.requestOpen(true)
    await modal.updateComplete
    const held = root.style.overflow
    modal.requestOpen(false)
    await modal.updateComplete
    expect([free, held, root.style.overflow]).toEqual(['', 'hidden', ''])
  })
})

describe('the drawer’s name', () => {
  test('is the heading in the header when no label is given', async () => {
    const drawer = (await mount(
      `<helix-headless-drawer>
        <div slot="header"><h2>Cart</h2><button>Close</button></div>
      </helix-headless-drawer>`,
    )) as Updatable & { requestUpdate(): void }
    /* happy-dom has no ARIA element reflection, so the accessor is stood in. */
    const panel = part(drawer, 'panel') as HTMLElement & Record<string, unknown>
    if (!('ariaLabelledByElements' in panel)) {
      Object.defineProperty(panel, 'ariaLabelledByElements', { value: null, writable: true })
    }
    drawer.requestUpdate()
    await drawer.updateComplete
    const named = (panel.ariaLabelledByElements as Element[] | null) ?? []
    expect(named.map((one) => one.textContent)).toEqual(['Cart'])
  })
})
