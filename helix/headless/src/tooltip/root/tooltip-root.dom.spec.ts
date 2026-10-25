import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, internalsOf, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The popover too, for the specs about two overlays open at once.
  await import('../../popover/index.js')
})

/* A tooltip that hid in one test is still warm in the next, a few milliseconds
   later, and would skip its delay. Each test leaves the page cold. After rather
   than before, because the browser harness carries afterEach and not
   beforeEach. */
const WARMTH = Symbol.for('fusion.helix.tooltip.warmth')
afterEach(() => {
  delete (globalThis as unknown as Record<symbol, unknown>)[WARMTH]
})

type Tooltip = HTMLElement & {
  content: string
  delay: number
  open: boolean
  placement: string
  show: () => void
  hide: () => void
  updateComplete: Promise<unknown>
  internals?: ElementInternals & { ariaDescribedByElements?: Element[] | null }
}

const tooltip = async (attrs = 'content="Regenerates the manifests"'): Promise<Tooltip> =>
  (await mount(
    `<helix-headless-tooltip ${attrs}><button>Analyze</button></helix-headless-tooltip>`,
  )) as Tooltip

/**
 * Focus as the browser delivers it: from the control, bubbling to the host.
 *
 * A bare `focusin` on the host is not the event a browser sends. `focusin`
 * bubbles *from* the element that took focus, and the tooltip reads the target to
 * ask whether the focus was one a reader chose, so dispatching it on the host
 * hands it an element that is not focused at all.
 */
const focusTrigger = async (tip: Tooltip): Promise<void> => {
  const trigger = tip.querySelector('button') as HTMLButtonElement
  trigger.focus()
  trigger.dispatchEvent(new Event('focusin', { bubbles: true }))
  await tip.updateComplete
}

/** A tooltip whose bubble is filled from the light DOM instead of `content`. */
const slotted = async (attrs = '', inner = '<b>Rich</b>'): Promise<Tooltip> =>
  (await mount(
    `<helix-headless-tooltip ${attrs}><button>Analyze</button><span slot="content">${inner}</span></helix-headless-tooltip>`,
  )) as Tooltip

/**
 * The content slot, and what a consumer put in it.
 *
 * `assignedNodes` without `flatten` on purpose, and not only because that is
 * the question being asked. happy-dom returns an empty list from the flattened
 * form where a browser returns the fallback, so a test written on `flatten`
 * would assert the opposite of what ships.
 */
const contentSlot = (tip: Tooltip): HTMLSlotElement | null =>
  tip.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="content"]') ?? null

const assigned = (tip: Tooltip): Node[] => contentSlot(tip)?.assignedNodes() ?? []

describe('tooltip', () => {
  test("the bubble is a tooltip, and the trigger stays the consumer's element", async () => {
    const tip = await tooltip()
    expect(part(tip, 'surface')?.getAttribute('role')).toBe('tooltip')
    expect(tip.firstElementChild?.tagName).toBe('BUTTON')
  })

  test('the description is linked by element, not by id', async () => {
    // An IDREF cannot cross a shadow boundary, so `aria-describedby` pointing
    // from a slotted trigger at a bubble in the shadow root resolves to
    // nothing at all.
    const tip = await tooltip()
    const linked = internalsOf(tip)?.ariaDescribedByElements
    expect(Array.isArray(linked) ? linked[0] : null).toBe(part(tip, 'surface'))
  })

  test('nothing is linked when there is nothing to say', async () => {
    const tip = await tooltip('content=""')
    expect(internalsOf(tip)?.ariaDescribedByElements ?? null).toBeNull()
  })

  test('it answers the keyboard as well as the pointer', async () => {
    // A tooltip that shows only on hover is one a keyboard reader never sees.
    const tip = await tooltip()
    const shown: string[] = []
    tip.dispatchEvent(new Event('pointerenter'))
    await tip.updateComplete
    shown.push('pointerenter')
    tip.hide()

    await focusTrigger(tip)
    shown.push('focusin')
    tip.hide()
    expect(shown).toEqual(['pointerenter', 'focusin'])
  })

  test('the pointer waits out the delay, and focus does not', async () => {
    // Sweeping a row of controls would otherwise flash a tooltip for each of
    // them. A keyboard reader landing on one has already committed to it.
    const tip = await tooltip('content="x" delay="50"')
    tip.dispatchEvent(new Event('pointerenter'))
    expect(tip.open).toBe(false)

    await focusTrigger(tip)
    expect(tip.open).toBe(true)
  })

  /* `delay="300ms"` was `NaN` to Lit's number converter, and a timer of `NaN`
     fires at once, so every sweep across a toolbar flashed each tooltip. */
  test('takes its delay as a CSS time, and waits it out', async () => {
    const tip = await tooltip('content="x" delay="0.06s"')
    expect(tip.delay).toBe(60)
    tip.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(tip.open).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(tip.open).toBe(true)
  })

  test('keeps its own delay for one that is not a time, and says so once', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    let tip: Tooltip
    try {
      tip = await tooltip('content="x" delay="soon"')
      await tooltip('content="y" delay="soon"')
    } finally {
      console.warn = original
    }
    expect(tip.delay).toBe(400)
    tip.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(tip.open).toBe(false)
    expect(warnings.filter((one) => one.includes('delay="soon"'))).toHaveLength(1)
  })

  test('it announces before it opens, and a refusal holds it shut', async () => {
    const tip = await tooltip()
    tip.addEventListener('helix-before-open', (event) => {
      event.preventDefault()
    })
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })

  test('it announces before it closes', async () => {
    const tip = await tooltip()
    tip.show()
    await tip.updateComplete
    let closed = false
    tip.addEventListener('helix-before-close', () => {
      closed = true
    })
    tip.hide()
    expect(closed).toBe(true)
  })

  test('an empty tooltip never shows', async () => {
    const tip = await tooltip('content=""')
    tip.show()
    await tip.updateComplete
    expect(part(tip, 'surface')?.matches(':popover-open') ?? false).toBe(false)
  })

  test('slotted content replaces the property rather than joining it', async () => {
    // Anything assigned wins, and the property is what the slot falls back to,
    // so a non-empty assignment is what settles which of the two shows.
    const tip = await slotted('content="Replaced"')
    expect(assigned(tip).map((node) => (node as Element).tagName)).toEqual(['SPAN'])
  })

  test('the property is the fallback, and lives in the slot', async () => {
    // Nothing assigned, so what shows is the slot's own content: the property.
    const tip = await tooltip()
    expect(assigned(tip)).toEqual([])
    expect(contentSlot(tip)?.textContent).toContain('Regenerates the manifests')
  })

  test('a tooltip with only slotted content shows, and is linked', async () => {
    // `content` is empty here, so an emptiness test that asked the property
    // rather than the slot would refuse to open a tooltip that has content.
    const tip = await slotted()
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(true)
    const linked = internalsOf(tip)?.ariaDescribedByElements
    expect(Array.isArray(linked) ? linked[0] : null).toBe(part(tip, 'surface'))
  })

  test('an empty slot is as empty as an empty property', async () => {
    const tip = await slotted('', '   ')
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })

  test('an element with no text of its own is still something to say', async () => {
    // The reason emptiness cannot be a text test. An icon is exactly what a
    // consumer reaches for the slot to say.
    const tip = await slotted('', '<helix-headless-icon name="info"></helix-headless-icon>')
    tip.show()
    await tip.updateComplete
    expect(tip.open).toBe(true)
  })

  test('disabled never shows', async () => {
    const tip = await tooltip('content="x" disabled')
    tip.show()
    await tip.updateComplete
    expect(part(tip, 'surface')?.matches(':popover-open') ?? false).toBe(false)
  })

  test('a tooltip moved in the page still opens', async () => {
    /* Its trigger is bound in `firstUpdated` and unbound on the way out, so a
       tooltip in a list a framework reordered never opened again. */
    const tip = await tooltip()
    const elsewhere = document.createElement('div')
    document.body.append(elsewhere)
    elsewhere.append(tip)
    await focusTrigger(tip)
    expect(tip.open).toBe(true)
  })
})

describe('tooltip for', () => {
  /* Trigger and tooltip as siblings in one tree, which is the whole point of
     `for`: an IDREF between them is then legal in the ordinary way, where a
     reference from a slotted trigger into this element's shadow root is not. */
  const pair = async (
    tipAttrs = 'id="tip" for="target" content="Writes the file to disk"',
    triggerAttrs = 'id="target" aria-describedby="tip"',
  ) => {
    const host = await mount(
      `<div><button ${triggerAttrs}>Save</button><helix-headless-tooltip ${tipAttrs}></helix-headless-tooltip></div>`,
    )
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    await tip.updateComplete
    return { button: host.querySelector('button') as HTMLElement, tip }
  }

  test('the bubble points at the element the id names, not at what is slotted', async () => {
    const { button, tip } = await pair()
    /* Reached through the private getter deliberately: what is being asserted
       is which element the floating controller anchors to, and there is no
       public surface for that by design. */
    expect((tip as unknown as { trigger: HTMLElement }).trigger).toBe(button)
  })

  test('the host names itself, so the description resolves with the bubble down', async () => {
    /* The measurement this exists for: a reference resolves to the referenced
       element's accessible *name*, which falls back to its contents only after
       `aria-label`. A closed popover's contents are `display: none`, so without
       a name of its own the host described nothing until the bubble was already
       up, and a screen reader computes the description as focus lands. */
    const { tip } = await pair()
    expect(internalsOf(tip)?.ariaLabel).toBe('Writes the file to disk')
  })

  test('the host is out of the accessibility tree while the bubble is down, and back while it shows', async () => {
    /* A named box with no role beside every trigger was a stray copy of the
       tooltip to a reader walking the page. The trigger's reference still
       reads its name. */
    const { tip } = await pair()
    expect(internalsOf(tip)?.ariaHidden).toBe('true')
    tip.show()
    await tip.updateComplete
    expect(internalsOf(tip)?.ariaHidden ?? null).toBeNull()
    tip.hide()
    await tip.updateComplete
    expect(internalsOf(tip)?.ariaHidden).toBe('true')
  })

  test('slotted content is named by its text, flattened', async () => {
    const host = await mount(
      `<div><button id="target" aria-describedby="tip">Save</button>` +
        `<helix-headless-tooltip id="tip" for="target"><span slot="content">Save <b>now</b></span></helix-headless-tooltip></div>`,
    )
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    await tip.updateComplete
    expect(internalsOf(tip)?.ariaLabel).toBe('Save now')
  })

  test('wrapping names the host too, since the trigger references it in both forms', async () => {
    const tip = await tooltip()
    await tip.updateComplete
    expect(internalsOf(tip)?.ariaLabel ?? null).toBe('Regenerates the manifests')
  })

  /* Named and described by its words, the host was a generic of its own
     beside the trigger in Chromium's tree, a second copy of the description.
     `none` takes the box out and leaves the name the trigger's reference
     reads, which Chromium still resolves. */
  test('the host is no box of its own in the accessibility tree, in both forms', async () => {
    const tip = await tooltip()
    await tip.updateComplete
    expect(internalsOf(tip)?.role).toBe('none')
    const { tip: beside } = await pair()
    expect(internalsOf(beside)?.role).toBe('none')
  })

  test('an id that names nothing resolves to no trigger', async () => {
    const { tip } = await pair('id="tip" for="absent" content="Nothing"')
    expect((tip as unknown as { named: HTMLElement | null }).named).toBeNull()
  })

  test('a trigger that does not point back is reported once', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const { tip } = await pair('id="tip" for="target" content="Unread"', 'id="target"')
      tip.show()
      await tip.updateComplete
      tip.hide()
      await tip.updateComplete
      tip.show()
      await tip.updateComplete
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('aria-describedby')
  })

  test('a trigger that does point back is left alone', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const { tip } = await pair()
      tip.show()
      await tip.updateComplete
    } finally {
      console.warn = original
    }
    expect(warnings).toEqual([])
  })

  test('activating the trigger takes the hint down', async () => {
    /* Nothing else would. `pointerleave` cannot fire while the pointer is still
       on the button it just pressed, and `focusout` does not fire when
       activation leaves focus where it was, so a gear that opened a drawer left
       its own label floating over the drawer.

       Holds are cleared with it: left set, the pointer stays recorded as being
       over the trigger and the next release anywhere brings the bubble back. */
    const host = (await mount(
      '<helix-headless-tooltip content="Preferences"><button type="button">gear</button></helix-headless-tooltip>',
    )) as HTMLElement & { open: boolean; updateComplete: Promise<boolean> }
    await host.updateComplete

    await focusTrigger(host as unknown as Tooltip)
    expect(host.open).toBe(true)

    const trigger = host.querySelector('button') as HTMLButtonElement
    trigger.click()
    await host.updateComplete
    expect(host.open).toBe(false)

    // And it stays down: a focusout now must not release it back open.
    host.dispatchEvent(new Event('focusout', { bubbles: true }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('unless it persists, where the hint is what changed', async () => {
    /* `CopyButton` swaps its content from Copy to Copied on the same click that
       used to hide the bubble, so the confirmation was written and taken off
       screen in one frame and a reader saw a flash. `persist` says the hint was
       not spent, it was replaced. */
    const host = (await mount(
      '<helix-headless-tooltip persist content="Copy"><button type="button">copy</button></helix-headless-tooltip>',
    )) as HTMLElement & { content: string; open: boolean; updateComplete: Promise<boolean> }
    await host.updateComplete

    await focusTrigger(host as unknown as Tooltip)
    expect(host.open).toBe(true)

    const trigger = host.querySelector('button') as HTMLButtonElement
    trigger.click()
    host.content = 'Copied'
    await host.updateComplete
    expect(host.open).toBe(true)

    /* A reader saying they are done still closes it. Activation is the control
       reporting success; a blur is the reader leaving. */
    host.dispatchEvent(new Event('focusout', { bubbles: true }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('and focus the reader did not choose takes no hold', async () => {
    /* **A mouse press focuses the button it pressed**, so an unconditional focus
       hold leaves the bubble up after any click: the pointer leaving releases
       the pointer hold, finds a focus hold still set, and the tooltip stays on
       screen until something else blurs the control.

       `:focus-visible` is the test, and this asserts it through the one case a
       unit DOM can express: a `focusin` whose target is not focused at all. The
       real case, a genuine mouse press on a real button, cannot be built here,
       since a programmatically focused element in this DOM *does* match
       `:focus-visible`. That half is checked in a browser instead, where hover
       opens the bubble, the click leaves it open reading Copied, and moving the
       pointer away closes it. */
    const tip = await tooltip('content="Copy" delay="0"')
    const unfocused = tip.querySelector('button') as HTMLButtonElement

    unfocused.dispatchEvent(new Event('focusin', { bubbles: true }))
    await tip.updateComplete
    expect(tip.open).toBe(false)

    // And the same event from a control that really has focus still opens it.
    await focusTrigger(tip)
    expect(tip.open).toBe(true)
  })
})

describe('Escape with more than one overlay open', () => {
  /* The tooltip's Escape goes through the same arbitration as every other
     overlay's, so a press closes the innermost open surface and only that.
     Before, the tooltip answered every press with a listener of its own, on
     the document for its whole connected life, so an Escape meant for a deeper
     panel took the tooltip down beside it. */
  type Popover = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

  const press = (): void => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
    )
  }

  test('closes a tooltip inside an open popover, and leaves the popover up', async () => {
    const popover = (await mount(
      `<helix-headless-popover label="Details" open>
        <button slot="trigger">Details</button>
        <helix-headless-tooltip content="Regenerates the manifests"><button>Analyze</button></helix-headless-tooltip>
      </helix-headless-popover>`,
    )) as Popover
    const tip = popover.querySelector('helix-headless-tooltip') as unknown as Tooltip
    await tip.updateComplete
    tip.show()
    await tip.updateComplete
    expect([popover.open, tip.open]).toEqual([true, true])

    press()
    await Promise.all([popover.updateComplete, tip.updateComplete])
    expect([popover.open, tip.open]).toEqual([true, false])
  })

  test('and closes a deeper popover while a shallower tooltip stays', async () => {
    document.body.innerHTML = `<helix-headless-tooltip content="Regenerates the manifests"><button>Analyze</button></helix-headless-tooltip>
      <section><div>
        <helix-headless-popover label="Details" open>
          <button slot="trigger">Details</button>
          <span>Body</span>
        </helix-headless-popover>
      </div></section>`
    const tip = document.querySelector('helix-headless-tooltip') as unknown as Tooltip
    const popover = document.querySelector('helix-headless-popover') as Popover
    await Promise.all([popover.updateComplete, tip.updateComplete])
    tip.show()
    await tip.updateComplete
    expect([popover.open, tip.open]).toEqual([true, true])

    press()
    await Promise.all([popover.updateComplete, tip.updateComplete])
    expect([popover.open, tip.open]).toEqual([false, true])
  })
})

describe('a tooltip beside an open menu or popover', () => {
  /* A tooltip outside an open panel sits over the panel the reader is using.
     A panel opened from the keyboard, or from a control beside the trigger
     while the pointer is still on it, comes with no `click` on the trigger and
     no `pointerleave`, so the tooltip yields to the panel instead. */
  type Popover = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

  const page = async (): Promise<{ popover: Popover; tip: Tooltip }> => {
    document.body.innerHTML = `<helix-headless-tooltip content="Regenerates the manifests" delay="0"><button>Analyze</button></helix-headless-tooltip>
      <helix-headless-popover label="Details">
        <button slot="trigger">Details</button>
        <helix-headless-tooltip content="Opens the log" delay="0"><button>Log</button></helix-headless-tooltip>
      </helix-headless-popover>`
    const tip = document.querySelector('helix-headless-tooltip') as unknown as Tooltip
    const popover = document.querySelector('helix-headless-popover') as Popover
    await Promise.all([popover.updateComplete, tip.updateComplete])
    return { popover, tip }
  }

  const open = async (popover: Popover): Promise<void> => {
    popover.open = true
    await popover.updateComplete
  }

  test('closes as the panel opens', async () => {
    const { popover, tip } = await page()
    await focusTrigger(tip)
    expect(tip.open).toBe(true)

    await open(popover)
    await tip.updateComplete
    expect([popover.open, tip.open]).toEqual([true, false])
  })

  test('and does not show for the pointer while the panel is open', async () => {
    /* The pointer and not focus, since focus moving out of a popover closes it. */
    const { popover, tip } = await page()
    const point = async (): Promise<void> => {
      tip.dispatchEvent(new Event('pointerleave'))
      tip.dispatchEvent(new Event('pointerenter'))
      await new Promise((done) => setTimeout(done, 10))
      await tip.updateComplete
    }
    await open(popover)
    await point()
    expect(tip.open).toBe(false)

    popover.open = false
    await popover.updateComplete
    await point()
    expect(tip.open).toBe(true)
  })

  test('a tooltip inside the open panel still shows', async () => {
    const { popover } = await page()
    await open(popover)
    const inner = popover.querySelector('helix-headless-tooltip') as unknown as Tooltip
    await focusTrigger(inner)
    expect(inner.open).toBe(true)
  })

  test("`show()` is the consumer's own, and is not refused", async () => {
    const { popover, tip } = await page()
    await open(popover)
    tip.show()
    await tip.updateComplete
    expect([popover.open, tip.open]).toEqual([true, true])
  })
})

describe('a tooltip that markup declared open', () => {
  /* `defaultOpen` is the uncontrolled half of `open`, and what the tooltip adds
     to the mixin's own contract is raising the bubble from it: a hint declared
     open in markup has to be showing at rest rather than waiting for a pointer
     that may never arrive.
   *
     It is asserted here rather than on the server, because nothing about being
     open reaches the render: the bubble is always drawn and the top layer is
     what shows it, so the served markup is the same either way and a spec
     against it would pass whatever `defaultOpen` did. */
  test('is open at rest, with no pointer and no focus', async () => {
    const tip = await tooltip('content="Saved" default-open')
    expect(tip.open).toBe(true)
  })

  test('and a tooltip nobody declared is shut, which is the resting state', async () => {
    const tip = await tooltip('content="Saved"')
    expect(tip.open).toBe(false)
  })

  test('the seed is a starting point, not a claim the tooltip returns to', async () => {
    // Control is an action rather than a mode: the element applies its own
    // changes from wherever markup started it, and a consumer who wants the
    // decision refuses the event instead.
    const tip = await tooltip('content="Saved" default-open')
    tip.hide()
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })
})

describe('moving onto the bubble', () => {
  /* WCAG 1.4.13: a reader can move the pointer onto the bubble, to read it
     under a magnifier, without it going. In the `for` form the bubble is not
     inside the trigger, so leaving the trigger for it used to hide it. */
  test('keeps a `for` tooltip open', async () => {
    const host = (await mount(
      `<div><button id="trigger" aria-describedby="tip">Save</button>
        <helix-headless-tooltip id="tip" for="trigger" content="Save your work" delay="0" delay-out="0"></helix-headless-tooltip></div>`,
    )) as HTMLElement
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    const trigger = host.querySelector('button') as HTMLButtonElement
    await tip.updateComplete
    trigger.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 5))
    await tip.updateComplete
    trigger.dispatchEvent(new Event('pointerleave'))
    part(tip, 'surface')?.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await tip.updateComplete
    expect(tip.open).toBe(true)
  })

  test('hides a `for` tooltip with `hoverable="false"`', async () => {
    const host = (await mount(
      `<div><button id="trigger" aria-describedby="tip">Save</button>
        <helix-headless-tooltip id="tip" for="trigger" content="Save your work" delay="0" delay-out="0" hoverable="false"></helix-headless-tooltip></div>`,
    )) as HTMLElement
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    const trigger = host.querySelector('button') as HTMLButtonElement
    await tip.updateComplete
    trigger.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 5))
    await tip.updateComplete
    trigger.dispatchEvent(new Event('pointerleave'))
    part(tip, 'surface')?.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })

  test('hides a wrapping tooltip with `hoverable="false"` once the pointer is on the bubble', async () => {
    const tip = (await mount(
      `<helix-headless-tooltip content="Save your work" delay="0" delay-out="0" hoverable="false"><button>Save</button></helix-headless-tooltip>`,
    )) as unknown as Tooltip
    await tip.updateComplete
    ;(tip as unknown as HTMLElement).dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 5))
    await tip.updateComplete
    expect(tip.open).toBe(true)
    part(tip, 'surface')?.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })
})

describe('tooltips that are warm', () => {
  /* Scanning a toolbar waits once. While one tooltip shows, the next trigger
     shows its own at once, and the first one goes. */
  test('show the next one with no delay, and hide the one left', async () => {
    const host = (await mount(
      `<div>
        <helix-headless-tooltip content="First" delay="1000"><button>One</button></helix-headless-tooltip>
        <helix-headless-tooltip content="Second" delay="1000"><button>Two</button></helix-headless-tooltip>
      </div>`,
    )) as HTMLElement
    const [first, second] = [
      ...host.querySelectorAll('helix-headless-tooltip'),
    ] as unknown as Tooltip[]
    await first?.updateComplete
    await second?.updateComplete
    first?.show()
    await first?.updateComplete
    second?.dispatchEvent(new Event('pointerenter'))
    await second?.updateComplete
    await first?.updateComplete
    expect([first?.open, second?.open]).toEqual([false, true])
  })

  test('and a cold one still waits out its delay', async () => {
    const tip = await tooltip('content="x" delay="1000"')
    tip.dispatchEvent(new Event('pointerenter'))
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })
})

describe('the wrapping form', () => {
  const warned = async (markup: string): Promise<string[]> => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const tip = (await mount(markup)) as Tooltip
      tip.show()
      await tip.updateComplete
    } finally {
      console.warn = original
    }
    return warnings
  }

  test('stays in the accessibility tree, since it holds its trigger', async () => {
    const tip = await tooltip()
    expect(internalsOf(tip)?.ariaHidden ?? null).toBeNull()
  })

  test('warns where the tooltip says what the trigger’s name does not', async () => {
    const warnings = await warned(
      '<helix-headless-tooltip content="Regenerates the manifests"><button>Analyze</button></helix-headless-tooltip>',
    )
    expect(warnings.length).toBe(1)
  })

  /* A reference to the element around the trigger resolves, so a plain
     trigger naming the tooltip that wraps it is described at rest, and the
     warning told that consumer to rewrite it in the `for` form. */
  test('and says nothing where the trigger names the tooltip that wraps it', async () => {
    const warnings = await warned(
      '<helix-headless-tooltip id="tip" content="Regenerates the manifests"><button aria-describedby="tip">Analyze</button></helix-headless-tooltip>',
    )
    expect(warnings).toEqual([])
  })

  /* An icon button named Settings under a tooltip reading Settings loses a
     reader nothing. A copy button draws exactly that in its own shadow root,
     where its consumer could not have acted on the warning. */
  test('and says nothing where the trigger is already named by its words', async () => {
    const warnings = await warned(
      '<helix-headless-tooltip content="Settings"><button aria-label="Settings">⚙</button></helix-headless-tooltip>',
    )
    expect(warnings).toEqual([])
  })
})

describe('the trigger is described by the tooltip itself', () => {
  type Reflecting = HTMLElement & { ariaDescribedByElements: Element[] | null }
  /* happy-dom has no element reflection, so the accessor is stood in. */
  const reflecting = (element: Element): Reflecting => {
    Object.defineProperty(element, 'ariaDescribedByElements', { value: null, writable: true })
    return element as Reflecting
  }

  test('a plain trigger in the consumer’s markup, once a reader points at it, and not before', async () => {
    const host = await mount(
      '<div><button id="save">Save</button><helix-headless-tooltip for="save" content="Writes the file"></helix-headless-tooltip></div>',
    )
    const button = reflecting(host.querySelector('button') as HTMLElement)
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    await tip.updateComplete
    expect(button.ariaDescribedByElements).toBeNull()
    button.dispatchEvent(new Event('pointerenter'))
    expect(button.ariaDescribedByElements).toEqual([tip as unknown as Element])
  })

  test('a wrapped trigger the same way, by the host around it', async () => {
    const tip = await tooltip()
    const button = reflecting(tip.querySelector('button') as HTMLElement)
    button.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }))
    expect(button.ariaDescribedByElements).toEqual([tip as unknown as Element])
  })

  test('never over an aria-describedby the consumer wrote', async () => {
    const host = await mount(
      '<div><span id="other">Other</span><button id="save" aria-describedby="other">Save</button><helix-headless-tooltip for="save" content="Writes the file"></helix-headless-tooltip></div>',
    )
    const button = reflecting(host.querySelector('button') as HTMLElement)
    button.dispatchEvent(new Event('pointerenter'))
    expect(button.ariaDescribedByElements).toBeNull()
  })

  /* The consumer named the tooltip in the trigger's own `aria-describedby`,
     which reflection reads back as the tooltip. A tooltip defined before its
     Helix trigger found that reference on the host, took it for a link of its
     own, and took it back on moving to the control inside, which removed the
     consumer's attribute and the trigger's description with it. */
  test('a reference the consumer wrote is theirs, and stays when the link moves inside', async () => {
    const trigger = reflecting(document.createElement('div'))
    trigger.id = 'own-reference'
    document.body.append(trigger)
    const tip = document.createElement('helix-headless-tooltip') as unknown as Tooltip & HTMLElement
    tip.id = 'own-reference-tip'
    tip.setAttribute('for', 'own-reference')
    tip.setAttribute('content', 'Writes the file')
    trigger.ariaDescribedByElements = [tip]
    document.body.append(tip)
    await tip.updateComplete

    const root = trigger.attachShadow({ delegatesFocus: true, mode: 'open' })
    root.innerHTML = '<button>Save</button>'
    const inner = reflecting(root.querySelector('button') as HTMLElement)
    inner.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }))
    // By identity: a deep comparison of two elements walks the whole document.
    expect(trigger.ariaDescribedByElements?.length).toBe(1)
    expect(trigger.ariaDescribedByElements?.[0] === tip).toBe(true)
    expect(inner.ariaDescribedByElements?.length).toBe(1)
    expect(inner.ariaDescribedByElements?.[0] === tip).toBe(true)
    tip.remove()
    trigger.remove()
  })

  test('a control inside a component’s shadow root is described where it takes focus', async () => {
    const host = await mount(
      '<div><div id="save"></div><helix-headless-tooltip for="save" content="Writes the file"></helix-headless-tooltip></div>',
    )
    const component = host.querySelector('#save') as HTMLElement
    const root = component.attachShadow({ mode: 'open' })
    root.innerHTML = '<button>Save</button>'
    const inner = reflecting(root.querySelector('button') as HTMLElement)
    const tip = host.querySelector('helix-headless-tooltip') as unknown as Tooltip
    inner.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }))
    expect(inner.ariaDescribedByElements).toEqual([tip as unknown as Element])
  })

  test('a described trigger is not warned about', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const tip = await tooltip()
      const button = reflecting(tip.querySelector('button') as HTMLElement)
      button.dispatchEvent(new Event('focusin', { bubbles: true, composed: true }))
      tip.show()
      await tip.updateComplete
    } finally {
      console.warn = original
    }
    expect(warnings).toEqual([])
  })
})

describe('the knobs on what shows it', () => {
  test('`show-on="focus"` ignores a pointer and still answers focus', async () => {
    const tip = await tooltip('content="Shortcut" show-on="focus" delay="0"')
    tip.dispatchEvent(new Event('pointerenter'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    await tip.updateComplete
    expect(tip.open).toBe(false)
  })

  test('`skip-delay` is how long the next one shows at once', async () => {
    /* One page, both connected: a popover that is not in the document cannot
       be shown, so the first has to still be there to hide. */
    const host = (await mount(
      `<div>
        <helix-headless-tooltip content="One" delay="0"><button>One</button></helix-headless-tooltip>
        <helix-headless-tooltip content="Two" delay="5000" skip-delay="0"><button>Two</button></helix-headless-tooltip>
      </div>`,
    )) as HTMLElement
    const [first, second] = [
      ...host.querySelectorAll('helix-headless-tooltip'),
    ] as unknown as Tooltip[]
    await first?.updateComplete
    await second?.updateComplete
    first?.show()
    await first?.updateComplete
    first?.hide()
    await first?.updateComplete
    second?.dispatchEvent(new Event('pointerenter'))
    await second?.updateComplete
    expect(second?.open).toBe(false)
    second?.dispatchEvent(new Event('pointerleave'))
  })
})

describe('entering and exiting', () => {
  /* Polls until neither phase holds, rather than sleeping a fixed time. */
  const settled = async (host: HTMLElement): Promise<void> => {
    const until = Date.now() + 1500
    do {
      await new Promise((resolve) => setTimeout(resolve, 10))
    } while ((hasState(host, 'entering') || hasState(host, 'exiting')) && Date.now() < until)
  }

  test('the bubble showing is entering until it settles, and one hiding is exiting', async () => {
    const host = await tooltip()
    host.show()
    await host.updateComplete
    expect(hasState(host, 'entering')).toBe(true)
    await settled(host)
    expect(hasState(host, 'entering')).toBe(false)
    host.hide()
    await host.updateComplete
    expect(hasState(host, 'exiting')).toBe(true)
    await settled(host)
    expect(hasState(host, 'exiting')).toBe(false)
  })
})
