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
