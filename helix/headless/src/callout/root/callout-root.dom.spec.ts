import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

/* sl-alert's `closable`: a note a reader may put away, which the page then
   removes. */
describe('a dismissible callout', () => {
  test('draws a named dismiss button that asks to be removed, and stays', async () => {
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

  test('draws no button unless asked', async () => {
    const note = await mount('<helix-headless-callout>Text</helix-headless-callout>')
    expect(note.shadowRoot?.querySelector('[part="dismiss"]')).toBeNull()
  })
})
