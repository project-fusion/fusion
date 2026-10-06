import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the page exists, since Lit reads `document` as it loads. */
let autofill: typeof import('./autofill-select.js')
let render: typeof import('lit').render

beforeAll(async () => {
  registerDom()
  autofill = await import('./autofill-select.js')
  ;({ render } = await import('lit'))
})

const OPTIONS = [
  { text: 'April', value: '04' },
  { text: 'May', value: '05' },
  { text: 'June', value: '06' },
]

const drawn = (
  options: Partial<import('./autofill-select.js').DrawAutofillOptions> = {},
): { box: HTMLElement; filled: string[] } => {
  const filled: string[] = []
  const box = document.createElement('div')
  render(
    autofill.drawAutofill({
      autocomplete: 'cc-exp-month',
      disabled: false,
      multiple: false,
      onFill: (value) => filled.push(value),
      options: OPTIONS,
      value: '',
      ...options,
    }),
    box,
  )
  return { box, filled }
}

/**
 * The native select a browser's autofill writes into, beside a custom select
 * it cannot see.
 */
describe('the hidden select a browser fills', () => {
  test('nothing without an autofill token', () => {
    expect(drawn({ autocomplete: '' }).box.querySelector('select')).toBeNull()
  })

  test('holds the options after an empty one, hidden from everyone but the browser', () => {
    const select = drawn().box.querySelector('select') as HTMLSelectElement
    expect(select.getAttribute('autocomplete')).toBe('cc-exp-month')
    expect(select.getAttribute('aria-hidden')).toBe('true')
    expect(select.getAttribute('tabindex')).toBe('-1')
    expect(select.hasAttribute('name')).toBe(false)
    expect([...select.options].map((option) => option.value)).toEqual(['', '04', '05', '06'])
    expect(select.getAttribute('style')).toContain('opacity:0')
  })

  test('marks what is chosen, and takes `disabled` and `multiple`', () => {
    const select = drawn({ disabled: true, multiple: true, value: '04,06' }).box.querySelector(
      'select',
    ) as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(select.multiple).toBe(true)
    expect([...select.options].filter((option) => option.selected).map((one) => one.value)).toEqual(
      ['04', '06'],
    )
  })

  test('hands a fill back as a value, without the empty option', () => {
    const { box, filled } = drawn({ multiple: true })
    const select = box.querySelector('select') as HTMLSelectElement
    for (const option of select.options) {
      option.selected = option.value === '' || option.value === '05' || option.value === '06'
    }
    select.dispatchEvent(new Event('change'))
    expect(filled).toEqual(['05,06'])
  })

  test('keeps its own input event to itself', () => {
    /* Measured in Chromium before this: the select's composed `input` reached
       the page ahead of the host's own, carrying the old value. */
    const { box } = drawn()
    const heard: string[] = []
    box.addEventListener('input', (event) => heard.push(event.type))
    const select = box.querySelector('select') as HTMLSelectElement
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(heard).toEqual([])
  })
})
