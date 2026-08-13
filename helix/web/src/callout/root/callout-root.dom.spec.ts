import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '../../testing/dom.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const iconSvg = (host: HTMLElement): Element | null =>
  host.shadowRoot?.querySelector('[part="icon"] svg') ?? null

describe('callout severity', () => {
  test('carries the severity as an accessible name, not only as a color', async () => {
    // Someone who cannot see that the box is red still has to learn it is an
    // error, so the icon is labelled rather than decorative.
    const callout = await mount('<helix-callout severity="danger">Failed</helix-callout>')
    expect(iconSvg(callout)?.getAttribute('role')).toBe('img')
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Error')
  })

  test('each severity names itself', async () => {
    for (const [severity, label] of [
      ['info', 'Information'],
      ['success', 'Success'],
      ['warning', 'Warning'],
      ['danger', 'Error'],
    ] as const) {
      const callout = await mount(`<helix-callout severity="${severity}">x</helix-callout>`)
      expect(iconSvg(callout)?.getAttribute('aria-label'), severity).toBe(label)
    }
  })

  test('an unknown severity falls back rather than rendering nothing', async () => {
    const callout = await mount('<helix-callout severity="nonsense">x</helix-callout>')
    expect(iconSvg(callout)?.getAttribute('aria-label')).toBe('Information')
  })

  test('is announced as a note', async () => {
    const callout = await mount('<helix-callout>x</helix-callout>')
    expect(part(callout, 'callout')?.getAttribute('role')).toBe('note')
  })
})

describe('callout icon slot', () => {
  test('a consumer icon replaces the default through slot fallback', async () => {
    // Slot fallback is the native mechanism for "default unless replaced", so
    // this needs no emptiness check and works on the server.
    const callout = await mount(
      '<helix-callout><helix-icon slot="icon" name="check"></helix-icon>Done</helix-callout>',
    )
    const slot = callout.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements().length).toBe(1)
    expect(slot.assignedElements()[0]?.tagName).toBe('HELIX-ICON')
  })

  test('with nothing slotted, the fallback is what is there', async () => {
    const callout = await mount('<helix-callout>x</helix-callout>')
    const slot = callout.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement
    expect(slot.assignedElements().length).toBe(0)
    expect(slot.querySelector('svg')).not.toBeNull()
  })
})
