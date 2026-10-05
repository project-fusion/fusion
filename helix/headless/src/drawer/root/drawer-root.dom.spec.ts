import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
    /* A made `MouseEvent` holds its point in whole pixels in Chromium, so a
       corner at 603.66 would be pressed at 603, outside the box. The press is
       on the first whole pixel inside it. */
    press(panel, Math.ceil(box.left), Math.floor(box.bottom))
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

type Drawer = Updatable & {
  close(value?: string): void
  returnValue: string
  show(): void
}

describe('the footer', () => {
  test('is a region of its own below the scrolling content, and holds the footer slot', async () => {
    const drawer = await mount(markup)
    const footer = part(drawer, 'footer') as HTMLElement
    expect(footer.querySelector('slot')?.getAttribute('name')).toBe('footer')
    expect(part(drawer, 'content')?.nextElementSibling).toBe(footer)
  })
})

describe('show() and close()', () => {
  test('open and close it through the request, and close() keeps what it closed with', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
    /* Read while the close is still a request: happy-dom's `close()` resets
       `returnValue`, where a browser's keeps it. */
    let returned = ''
    drawer.addEventListener('helix-before-close', () => {
      returned = drawer.returnValue
    })
    drawer.close('saved')
    await drawer.updateComplete
    expect(drawer.open).toBe(false)
    expect(returned).toBe('saved')
  })

  test('a refused close keeps the drawer open and the value it had', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    drawer.addEventListener('helix-before-close', (event) => event.preventDefault())
    drawer.close('saved')
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
    expect(drawer.returnValue).toBe('')
  })
})

describe('Escape on a drawer that is not modal', () => {
  const browserKnows = 'closedBy' in HTMLDialogElement.prototype

  test('closes it where the browser has no `closedby` to ask', async () => {
    const drawer = (await mount(
      markup.replace('<helix-headless-drawer', '<helix-headless-drawer modal="false"'),
    )) as Drawer
    drawer.show()
    await drawer.updateComplete
    const key = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    ;(part(drawer, 'panel') as HTMLElement).dispatchEvent(key)
    await drawer.updateComplete
    expect(drawer.open).toBe(browserKnows)
    expect(key.defaultPrevented).toBe(!browserKnows)
  })

  test('and leaves a modal one to the platform', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    const key = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    ;(part(drawer, 'panel') as HTMLElement).dispatchEvent(key)
    expect(key.defaultPrevented).toBe(false)
  })
})

describe('swiping it away', () => {
  /* happy-dom has no layout, so the panel is given a size, and the pointer is
     a touch, which is what swipes. */
  const swipe = async (
    drawer: Drawer,
    to: number,
    { pointerType = 'touch', steps = [to] }: { pointerType?: string; steps?: number[] } = {},
  ): Promise<HTMLElement> => {
    const panel = part(drawer, 'panel') as HTMLElement
    panel.getBoundingClientRect = () => ({ height: 600, width: 320 }) as DOMRect
    const at = (type: string, x: number, time: number, target: EventTarget = window): void => {
      const event = new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
        clientY: 100,
        composed: true,
        pointerId: 7,
        pointerType,
      })
      Object.defineProperty(event, 'timeStamp', { value: time })
      target.dispatchEvent(event)
    }
    at('pointerdown', 0, 0, panel)
    for (const [index, x] of steps.entries()) {
      at('pointermove', x, 1000 + index * 1000)
    }
    return panel
  }
  const release = (x: number, time: number): void => {
    const event = new PointerEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: 100,
      pointerId: 7,
    })
    Object.defineProperty(event, 'timeStamp', { value: time })
    window.dispatchEvent(event)
  }

  test('follows the finger toward the edge it came from', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    const panel = await swipe(drawer, 60)
    expect(panel.style.getPropertyValue('--drawer-swipe-x')).toBe('60px')
    release(60, 3000)
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
    expect(panel.style.getPropertyValue('--drawer-swipe-x')).toBe('')
  })

  test('closes it past halfway, through the request', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    let asked = 0
    drawer.addEventListener('helix-before-close', () => {
      asked += 1
    })
    await swipe(drawer, 200)
    release(200, 3000)
    await drawer.updateComplete
    expect(asked).toBe(1)
    expect(drawer.open).toBe(false)
  })

  test('comes to rest at a snap point', async () => {
    const drawer = (await mount(
      markup.replace('<helix-headless-drawer', '<helix-headless-drawer snap-points="0.5 1"'),
    )) as Drawer
    drawer.show()
    await drawer.updateComplete
    const panel = await swipe(drawer, 150)
    release(150, 3000)
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
    expect(panel.style.getPropertyValue('--drawer-swipe-x')).toBe('160px')
  })

  test('a mouse drags nothing, and swipe="false" turns it off', async () => {
    const drawer = (await mount(markup)) as Drawer
    drawer.show()
    await drawer.updateComplete
    const panel = await swipe(drawer, 200, { pointerType: 'mouse' })
    expect(panel.style.getPropertyValue('--drawer-swipe-x')).toBe('')
    release(200, 3000)
    const off = (await mount(
      markup.replace('<helix-headless-drawer', '<helix-headless-drawer swipe="false"'),
    )) as Drawer
    off.show()
    await off.updateComplete
    const still = await swipe(off, 200)
    expect(still.style.getPropertyValue('--drawer-swipe-x')).toBe('')
    release(200, 3000)
  })
})

describe('the close control', () => {
  test('is drawn only on a dismissible drawer', async () => {
    const drawer = await mount(markup)
    expect(part(drawer, 'dismiss')).toBeNull()
  })

  test('is a button named by `dismiss-label`, last in the panel, holding the dismiss-icon slot', async () => {
    const drawer = await mount(
      markup.replace(
        '<helix-headless-drawer',
        '<helix-headless-drawer dismissible dismiss-label="Schließen"',
      ),
    )
    const dismiss = part(drawer, 'dismiss') as HTMLButtonElement
    expect(dismiss.localName).toBe('button')
    expect(dismiss.getAttribute('aria-label')).toBe('Schließen')
    expect(part(drawer, 'panel')?.lastElementChild).toBe(dismiss)
    expect(dismiss.querySelector('slot')?.getAttribute('name')).toBe('dismiss-icon')
    expect(part(drawer, 'dismiss-mark')).not.toBeNull()
  })

  test('closes the drawer through the request, which a listener can refuse', async () => {
    const drawer = (await mount(
      markup.replace('<helix-headless-drawer', '<helix-headless-drawer dismissible'),
    )) as Drawer
    drawer.show()
    await drawer.updateComplete
    const refuse = (event: Event): void => event.preventDefault()
    drawer.addEventListener('helix-before-close', refuse)
    ;(part(drawer, 'dismiss') as HTMLButtonElement).click()
    await drawer.updateComplete
    expect(drawer.open).toBe(true)
    drawer.removeEventListener('helix-before-close', refuse)
    ;(part(drawer, 'dismiss') as HTMLButtonElement).click()
    await drawer.updateComplete
    expect(drawer.open).toBe(false)
  })
})

describe('the snap point it rests at', () => {
  type Snapping = Drawer & { snap: number; snapTo(point: number): void }
  const sheet = async (): Promise<Snapping> => {
    const drawer = (await mount(
      `<helix-headless-drawer label="Sheet" placement="bottom" snap-points="0.5 1">
        <button id="top">Top</button>
        <button id="low">Low</button>
      </helix-headless-drawer>`,
    )) as Snapping
    drawer.show()
    await drawer.updateComplete
    return drawer
  }

  test('is `snap`, and the host says when it is short of the whole panel', async () => {
    const drawer = await sheet()
    expect(drawer.snap).toBe(0.5)
    expect(hasState(drawer, 'snapped')).toBe(true)
    drawer.snapTo(0.9)
    expect(drawer.snap).toBe(1)
    expect(hasState(drawer, 'snapped')).toBe(false)
    drawer.snapTo(0.4)
    drawer.close()
    await drawer.updateComplete
    expect([drawer.snap, hasState(drawer, 'snapped')]).toEqual([1, false])
  })

  test('is the whole panel on a drawer without snap points', async () => {
    const drawer = (await mount(markup)) as Drawer & { snap: number }
    drawer.show()
    await drawer.updateComplete
    expect(drawer.snap).toBe(1)
    expect(hasState(drawer, 'snapped')).toBe(false)
  })

  test('opens to the largest when focus moves to a control past the window’s edge', async () => {
    const drawer = await sheet()
    const low = drawer.querySelector('#low') as HTMLElement
    low.getBoundingClientRect = () =>
      ({
        bottom: window.innerHeight + 40,
        left: 0,
        right: 80,
        top: window.innerHeight + 8,
      }) as DOMRect
    ;(drawer.querySelector('#top') as HTMLElement).focus()
    expect(hasState(drawer, 'snapped')).toBe(true)
    low.focus()
    expect(hasState(drawer, 'snapped')).toBe(false)
    expect(drawer.snap).toBe(1)
  })
})
