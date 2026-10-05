import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the page exists, since Lit reads `document` as it loads. */
let dismiss: typeof import('./draw-dismiss.js')
let html: typeof import('lit').html
let render: typeof import('lit').render

beforeAll(async () => {
  registerDom()
  dismiss = await import('./draw-dismiss.js')
  ;({ html, render } = await import('lit'))
})

const drawn = (template: unknown): HTMLElement => {
  const box = document.createElement('div')
  render(template, box)
  return box
}

describe('a dismiss button', () => {
  test('is a plain button named by its label, holding its mark', () => {
    const box = drawn(
      dismiss.drawDismiss({
        label: 'Dismiss',
        mark: html`<slot name="dismiss-icon">${dismiss.drawDismissGlyph()}</slot>`,
        onDismiss: () => {},
      }),
    )
    const button = box.querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('part')).toBe('dismiss')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-label')).toBe('Dismiss')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.hasAttribute('tabindex')).toBe(false)
    const slot = button.querySelector('slot') as HTMLSlotElement
    expect(slot.name).toBe('dismiss-icon')
    const mark = slot.querySelector('svg') as SVGElement
    expect(mark.getAttribute('part')).toBe('dismiss-mark')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
  })

  test('a press dismisses', () => {
    let pressed = 0
    const box = drawn(
      dismiss.drawDismiss({
        label: 'Dismiss',
        mark: dismiss.drawDismissGlyph(),
        onDismiss: () => pressed++,
      }),
    )
    ;(box.querySelector('button') as HTMLButtonElement).click()
    expect(pressed).toBe(1)
  })

  test('takes a disabled state and a tab index', () => {
    const box = drawn(
      dismiss.drawDismiss({
        disabled: true,
        label: 'Remove Design',
        mark: html`<b>x</b>`,
        onDismiss: () => {},
        tabindex: '-1',
      }),
    )
    const button = box.querySelector('button') as HTMLButtonElement
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('tabindex')).toBe('-1')
    expect(button.querySelector('b')?.textContent).toBe('x')
  })
})

describe('the cross on a dismiss button', () => {
  test('is a glyph that inherits its color and stays out of the accessibility tree', () => {
    const mark = drawn(dismiss.drawDismissGlyph()).querySelector('svg') as SVGElement
    expect(mark.getAttribute('part')).toBe('dismiss-mark')
    expect(mark.getAttribute('fill')).toBe('currentColor')
    expect(mark.getAttribute('aria-hidden')).toBe('true')
    expect(mark.getAttribute('viewBox')).not.toBeNull()
  })
})
