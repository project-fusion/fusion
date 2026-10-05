import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
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

describe('focus leaving a popover', () => {
  /* The panel traps nothing, so `Tab` past its last control walks on into the
     page. Left open there, it covered what the reader had moved to. */
  const leave = async (to: (host: Popover) => Element): Promise<boolean> => {
    document.body.innerHTML = ''
    const host = await popover()
    const after = document.createElement('button')
    document.body.append(after)
    host.show()
    await host.updateComplete
    const inside = host.querySelector('span') as HTMLElement
    inside.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: to(host) }),
    )
    await host.updateComplete
    return hasState(host, 'open')
  }

  test('closes it when focus goes elsewhere on the page', async () => {
    expect(await leave(() => document.body.lastElementChild as Element)).toBe(false)
  })

  test('and keeps it open while focus moves between the trigger and the panel', async () => {
    expect(await leave((host) => host.querySelector('button') as Element)).toBe(true)
  })
})

describe('the popover’s name', () => {
  test('is what a host `aria-labelledby` names, carried to the panel', async () => {
    document.body.innerHTML = ''
    const host = (await mount(
      `<div><h3 id="title">Filters</h3>
        <helix-headless-popover aria-labelledby="title"><span>Body</span></helix-headless-popover>
      </div>`,
    )) as HTMLElement
    const popoverHost = host.querySelector('helix-headless-popover') as Popover & {
      requestUpdate(): void
    }
    await popoverHost.updateComplete
    /* happy-dom has no ARIA element reflection, so the accessor is stood in. */
    const panel = part(popoverHost, 'popover') as HTMLElement & Record<string, unknown>
    if (!('ariaLabelledByElements' in panel)) {
      Object.defineProperty(panel, 'ariaLabelledByElements', { value: null, writable: true })
    }
    popoverHost.requestUpdate()
    await popoverHost.updateComplete
    const named = (panel.ariaLabelledByElements as Element[] | null) ?? []
    expect(named.map((one) => one.id)).toEqual(['title'])
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

  /**
   * Where the panel lands on a right-to-left page.
   *
   * **The direction is set on the root, and a wrapper would not do.** A panel
   * in the top layer is laid out against the viewport, whose direction is the
   * root's, and with the user agent's `inset: 0` standing on both sides that
   * direction decides which of the two survives. Under `<div dir="rtl">` in an
   * English document the left one does, and a panel written from the
   * inline-start edge still lands; under `<html dir="rtl">` it was put a
   * window's width out, measured past the right edge of every window.
   *
   * No sheet for the panel beyond its size, so the user agent's inset and
   * margin are what it is placed against, as they are for any consumer who
   * styles nothing.
   */
  describe('popover on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    const opened = async (
      placement: string,
      at: string,
    ): Promise<{ panel: DOMRect; trigger: DOMRect; side: string | null }> => {
      document.documentElement.dir = 'rtl'
      const host = (await mount(
        `<helix-headless-popover label="Details" placement="${placement}">
          <button id="trigger" slot="trigger">Details</button>
          <span>Body</span>
        </helix-headless-popover>
        <style>
          #trigger { block-size: 2rem; inline-size: 8rem; inset-block-start: 4rem; position: fixed; ${at} }
          helix-headless-popover::part(popover) { block-size: 4rem; box-sizing: border-box; inline-size: 12rem; padding: 0 }
        </style>`,
      )) as Popover
      host.show()
      await host.updateComplete
      /* `computePosition` resolves after the update, and `autoUpdate` places
         once as it starts: two frames cover both. */
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      const panel = part(host, 'popover') as HTMLElement
      return {
        panel: panel.getBoundingClientRect(),
        side: panel.getAttribute('data-placement'),
        trigger: (host.querySelector('#trigger') as HTMLElement).getBoundingClientRect(),
      }
    }

    /* `-start` is the trigger's start edge, which is its right here. Floating
       UI resolves the alignment from the panel's own direction; what it hands
       back is a distance from the left, and that is the edge it is added to. */
    test('bottom-start lines the panel up with the trigger’s start edge, its right', async () => {
      const { panel, side, trigger } = await opened('bottom-start', 'left: 20rem;')
      expect(side).toBe('bottom-start')
      expect(Math.round(panel.right)).toBe(Math.round(trigger.right))
      expect(panel.top).toBeGreaterThanOrEqual(trigger.bottom)
      expect(panel.left).toBeGreaterThanOrEqual(0)
    })

    /* A side is physical, as the name says, and the flip reads the same
       measurements the placement does: with no room on the right of a trigger
       at the window's right edge, it goes left, and inside the window. */
    test('a side with no room flips to the other one, inside the window', async () => {
      const { panel, side, trigger } = await opened('right', 'right: 1rem;')
      expect(side).toBe('left')
      expect(panel.right).toBeLessThanOrEqual(trigger.left)
      expect(panel.left).toBeGreaterThanOrEqual(0)
      expect(panel.right).toBeLessThanOrEqual(window.innerWidth)
    })
  })
}

describe('focus on the way in', () => {
  const withControls = async (extra = ''): Promise<Popover> =>
    (await mount(
      `<helix-headless-popover ${extra}>
        <button slot="trigger">Filters</button>
        <h3>Filters</h3>
        <button id="first">Apply</button>
        <button id="last">Clear</button>
      </helix-headless-popover>`,
    )) as Popover

  test('moves to the first control in the panel when it opens', async () => {
    const host = await withControls()
    host.show()
    await host.updateComplete
    expect(document.activeElement?.id).toBe('first')
  })

  test('moves to the panel itself where it holds no control', async () => {
    const host = await popover()
    host.show()
    await host.updateComplete
    expect(host.shadowRoot?.activeElement).toBe(part(host, 'popover'))
  })

  test('stays where it is for a popover served open, which nobody opened', async () => {
    const host = await withControls('default-open')
    expect(host.contains(document.activeElement)).toBe(false)
  })

  test('goes back to the trigger when the panel closes from inside', async () => {
    const host = await withControls()
    const trigger = host.querySelector('[slot="trigger"]') as HTMLElement
    trigger.focus()
    host.show()
    await host.updateComplete
    expect(document.activeElement?.id).toBe('first')
    host.hide()
    await host.updateComplete
    expect(document.activeElement).toBe(trigger)
  })
})

describe('a modal popover', () => {
  test('says so, and keeps Tab inside, wrapping at either end', async () => {
    const host = (await mount(
      `<helix-headless-popover modal>
        <button slot="trigger">Filters</button>
        <button id="first">Apply</button>
        <button id="last">Clear</button>
      </helix-headless-popover>`,
    )) as Popover
    host.show()
    await host.updateComplete
    expect(part(host, 'popover')?.getAttribute('aria-modal')).toBe('true')
    ;(host.querySelector('#last') as HTMLElement).focus()
    const tab = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    host.querySelector('#last')?.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('first')
  })

  test('and an ordinary one leaves Tab alone', async () => {
    const host = await popover()
    host.show()
    await host.updateComplete
    expect(part(host, 'popover')?.hasAttribute('aria-modal')).toBe(false)
  })
})

describe('the panel’s name and its point', () => {
  test('is the first heading in the panel where label was left alone', async () => {
    const host = (await mount(
      `<helix-headless-popover>
        <button slot="trigger">Filters</button>
        <div><h3>Filters</h3></div>
      </helix-headless-popover>`,
    )) as Popover & { requestUpdate(): void }
    const panel = part(host, 'popover') as HTMLElement & Record<string, unknown>
    /* happy-dom has no element reflection, so the accessor is stood in. */
    Object.defineProperty(panel, 'ariaLabelledByElements', { value: null, writable: true })
    host.requestUpdate()
    await host.updateComplete
    const names = (panel.ariaLabelledByElements as Element[] | null)?.map((one) => one.textContent)
    expect(names).toEqual(['Filters'])
  })

  test('no point unless asked for, and one with `arrow`', async () => {
    expect(part(await popover(), 'arrow')).toBeNull()
    const pointed = await popover('arrow')
    expect(part(pointed, 'arrow')?.getAttribute('aria-hidden')).toBe('true')
  })
})
