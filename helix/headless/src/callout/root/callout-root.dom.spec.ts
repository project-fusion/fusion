import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The region carries the name, so a slotted icon keeps it. */
const iconSvg = (host: HTMLElement): Element | null =>
  host.shadowRoot?.querySelector('[part="icon"]') ?? null

describe('callout tone', () => {
  test('carries the tone as an accessible name, not only as a color', async () => {
    // Someone who cannot see that the box is red still has to learn it is an
    // error, so the icon is labeled rather than decorative.
    const callout = await mount(
      '<helix-headless-callout tone="danger">Failed</helix-headless-callout>',
    )
    expect(iconSvg(callout)?.getAttribute('role')).toBe('img')
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Error')
  })

  test('each tone names itself', async () => {
    for (const [tone, label] of [
      ['info', 'Information'],
      ['neutral', 'Note'],
      ['success', 'Success'],
      ['warning', 'Warning'],
      ['danger', 'Error'],
    ] as const) {
      const callout = await mount(
        `<helix-headless-callout tone="${tone}">x</helix-headless-callout>`,
      )
      expect(iconSvg(callout)?.getAttribute('aria-label'), tone).toBe(label)
    }
  })

  test('an unknown tone falls back rather than rendering nothing', async () => {
    const callout = await mount(
      '<helix-headless-callout tone="nonsense">x</helix-headless-callout>',
    )
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Information')
  })

  test('is announced as a note', async () => {
    const callout = await mount('<helix-headless-callout>x</helix-headless-callout>')
    expect(role(callout)).toBe('note')
  })
})

describe('the tone name', () => {
  /* It was fixed English, and it was on the fallback glyph, so a slotted icon
     took the tone's name away with the glyph. */
  test('can be said in another language', async () => {
    const callout = await mount(
      '<helix-headless-callout tone="danger" tone-label="Fehler">x</helix-headless-callout>',
    )
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Fehler')
  })

  test('stays when an icon is slotted in place of the glyph', async () => {
    const callout = await mount(
      '<helix-headless-callout tone="danger"><span slot="icon">!</span>Payment failed.</helix-headless-callout>',
    )
    expect(iconSvg(callout)?.getAttribute('role')).toBe('img')
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Error')
  })
})

describe('callout icon slot', () => {
  test('a consumer icon replaces the default through slot fallback', async () => {
    // Slot fallback is the native mechanism for "default unless replaced", so
    // this needs no emptiness check and works on the server.
    const callout = await mount(
      '<helix-headless-callout><helix-headless-icon slot="icon" name="check"></helix-headless-icon>Done</helix-headless-callout>',
    )
    const slot = callout.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements().length).toBe(1)
    expect(slot.assignedElements()[0]?.tagName).toBe('HELIX-HEADLESS-ICON')
  })

  test('with nothing slotted, the fallback is what is there', async () => {
    const callout = await mount('<helix-headless-callout>x</helix-headless-callout>')
    const slot = callout.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements().length).toBe(0)
    expect(slot.querySelector('svg')).not.toBeNull()
  })
})

/* Measured before this: a callout had no state but `settled`, so a sheet
   could not lay out a callout with a heading, or one with a page's own icon,
   apart from the rest. */
describe('the regions a callout holds', () => {
  test('say through states whether a heading or an icon of the page is slotted', async () => {
    const plain = (await mount(
      '<helix-headless-callout>x</helix-headless-callout>',
    )) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await plain.updateComplete
    expect([hasState(plain, 'has-heading'), hasState(plain, 'has-icon')]).toEqual([false, false])
    const full = (await mount(
      '<helix-headless-callout><strong slot="heading">Note</strong><svg slot="icon"></svg>x</helix-headless-callout>',
    )) as HTMLElement & { updateComplete: Promise<boolean> }
    await full.updateComplete
    expect([hasState(full, 'has-heading'), hasState(full, 'has-icon')]).toEqual([true, true])
  })
})

/* An `<svg>` a page slotted as the icon was read as a second, unnamed image
   beside the tone's name. */
describe('a slotted icon', () => {
  test('is drawn and not read, the region around it carrying the name', async () => {
    const callout = await mount(
      '<helix-headless-callout tone="warning"><svg slot="icon"></svg>Careful.</helix-headless-callout>',
    )
    const slot = callout.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.getAttribute('aria-hidden')).toBe('true')
    expect(part(callout, 'icon')?.getAttribute('aria-label')).toBe('Warning')
  })
})

/* sl-alert's `closable`: a note a reader may put away, which hides itself
   unless the page says otherwise. */
describe('a dismissible callout', () => {
  test('draws a named dismiss button that asks to be removed, and stays in the page', async () => {
    const note = await mount(
      '<helix-headless-callout dismissible dismiss-label="Hide tip">Drafts save every minute.</helix-headless-callout>',
    )
    const button = note.shadowRoot?.querySelector('[part="dismiss"]') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Hide tip')
    let heard = ''
    note.addEventListener('helix-dismiss', (event) => {
      heard = (event as CustomEvent<{ label: string }>).detail.label
    })
    button.click()
    expect(heard).toBe('Drafts save every minute.')
    expect(note.isConnected).toBe(true)
  })

  /* Every button was "Dismiss", which says nothing about which callout it
     takes away. */
  test('names the button for the heading, or for the tone where there is none', async () => {
    const titled = await mount(
      '<helix-headless-callout dismissible tone="warning"><span slot="heading">Scheduled maintenance</span>Down on Sunday.</helix-headless-callout>',
    )
    await (titled as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(titled.shadowRoot?.querySelector('[part="dismiss"]')?.getAttribute('aria-label')).toBe(
      'Dismiss Scheduled maintenance',
    )
    const plain = await mount(
      '<helix-headless-callout dismissible tone="danger">Failed.</helix-headless-callout>',
    )
    expect(plain.shadowRoot?.querySelector('[part="dismiss"]')?.getAttribute('aria-label')).toBe(
      'Dismiss Error',
    )
  })

  test('draws no button unless asked', async () => {
    const note = await mount('<helix-headless-callout>Text</helix-headless-callout>')
    expect(note.shadowRoot?.querySelector('[part="dismiss"]')).toBeNull()
  })

  type Note = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

  const dismissOf = (note: Note): HTMLButtonElement =>
    note.shadowRoot?.querySelector('[part="dismiss"]') as HTMLButtonElement

  /* Two frames, which is what a callout with no animation waits before it
     hides, and a turn after. */
  const frames = async (): Promise<void> => {
    for (let at = 0; at < 3; at += 1) {
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    }
    await new Promise((done) => setTimeout(done, 0))
  }

  /* Measured before this: a press on the button with no listener did
     nothing at all, and a callout had no way out that a sheet could draw. */
  test('hides itself once the dismissal stands, leaving through `exiting`', async () => {
    const note = (await mount(
      '<helix-headless-callout dismissible>Drafts save every minute.</helix-headless-callout>',
    )) as Note
    await note.updateComplete
    dismissOf(note).click()
    await note.updateComplete
    expect(note.open).toBe(false)
    expect([hasState(note, 'closed'), hasState(note, 'exiting')]).toEqual([true, true])
    expect(note.hasAttribute('hidden')).toBe(false)
    await frames()
    expect(hasState(note, 'exiting')).toBe(false)
    expect(note.hasAttribute('hidden')).toBe(true)
    note.open = true
    await note.updateComplete
    expect([hasState(note, 'closed'), hasState(note, 'entering')]).toEqual([false, true])
    expect(note.hasAttribute('hidden')).toBe(false)
  })

  test('hands focus to the next callout once it has hidden', async () => {
    document.body.innerHTML =
      '<helix-headless-callout dismissible>One</helix-headless-callout><helix-headless-callout dismissible>Two</helix-headless-callout>'
    const [first, second] = [...document.body.children] as Note[]
    await Promise.all([first?.updateComplete, second?.updateComplete])
    const button = (one: Note | undefined): HTMLButtonElement =>
      one?.shadowRoot?.querySelector('[part="dismiss"]') as HTMLButtonElement
    button(first).focus()
    button(first).click()
    await frames()
    await frames()
    expect(first?.hasAttribute('hidden')).toBe(true)
    expect(second?.shadowRoot?.activeElement).toBe(button(second))
  })

  test('stays showing where a listener cancels, and stays open where one removes it', async () => {
    const kept = (await mount(
      '<helix-headless-callout dismissible>Kept.</helix-headless-callout>',
    )) as Note
    kept.addEventListener('helix-dismiss', (event) => event.preventDefault())
    dismissOf(kept).click()
    await kept.updateComplete
    expect(kept.open).toBe(true)
    const removed = (await mount(
      '<helix-headless-callout dismissible>Removed.</helix-headless-callout>',
    )) as Note
    removed.addEventListener('helix-dismiss', () => removed.remove())
    dismissOf(removed).click()
    expect(removed.open).toBe(true)
  })
})
