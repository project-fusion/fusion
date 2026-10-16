import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessCodeInput } from './code-input-root.js'

let registerHighlighter: typeof import('../../code-block/highlighter.js').registerHighlighter

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  ;({ registerHighlighter } = await import('../../code-block/highlighter.js'))
})

/* The registration is the page's, so every other spec draws plain. */
afterEach(() => {
  registerHighlighter(undefined)
})

const field = async (attributes = '', value = ''): Promise<HelixHeadlessCodeInput> => {
  const element = (await mount(
    `<helix-headless-code-input label="Payload" ${attributes}></helix-headless-code-input>`,
  )) as HelixHeadlessCodeInput
  element.value = value
  await element.updateComplete
  return element
}

const control = (element: HelixHeadlessCodeInput): HTMLTextAreaElement =>
  part(element, 'control') as HTMLTextAreaElement

/** A key pressed in the textarea, and whether the field let it through. */
const press = (element: HelixHeadlessCodeInput, key: string, shiftKey = false): boolean =>
  control(element).dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      shiftKey,
    }),
  )

/** Stands in for Shiki or Prism: escapes the code and marks each quoted string. */
const quoted = (code: string): string =>
  code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"[^"]*"/g, (match) => `<span class="string">${match}</span>`)

describe('code input', () => {
  test('draws the text under a textarea, one layer over the other', async () => {
    const element = await field('', 'a < b')
    expect(part(element, 'layers')?.hasAttribute('data-layers')).toBe(true)
    expect(part(element, 'highlight')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(element, 'highlight')?.textContent).toBe('a < b')
    expect(control(element).value).toBe('a < b')
  })

  test('keeps spellcheck, capitals and correction off, as code wants', async () => {
    const element = await field()
    expect(part(element, 'layers')?.getAttribute('spellcheck')).toBe('false')
    expect(control(element).getAttribute('autocapitalize')).toBe('off')
    expect(control(element).getAttribute('autocorrect')).toBe('off')
  })

  test('draws in the registered highlighter, and plain without one', async () => {
    const element = await field('language="json"', '{ "a": 1 }')
    expect(part(element, 'highlight')?.querySelector('.string')).toBeNull()
    registerHighlighter(quoted)
    await settle(element)
    await element.updateComplete
    expect(part(element, 'highlight')?.querySelector('.string')?.textContent).toBe('"a"')
  })

  test('its own highlight wins over the registered one', async () => {
    registerHighlighter(() => '<b>registered</b>')
    const element = await field('', '"own"')
    element.highlight = quoted
    await element.updateComplete
    expect(part(element, 'highlight')?.querySelector('.string')?.textContent).toBe('"own"')
  })

  test('draws plain where the highlighter throws, and reports it', async () => {
    const reported: unknown[] = []
    const report = globalThis.reportError
    globalThis.reportError = (error) => reported.push(error)
    try {
      const element = await field('', 'x')
      element.highlight = () => {
        throw new Error('no grammar')
      }
      await element.updateComplete
      expect(part(element, 'highlight')?.textContent).toBe('x')
      expect(reported).toHaveLength(1)
    } finally {
      globalThis.reportError = report
    }
  })

  test('ends the highlight a line lower where the code ends in a break', async () => {
    const element = await field('', 'a\n')
    expect(part(element, 'highlight')?.textContent).toBe('a\n ')
  })

  test('keeps long lines their length, unless wrap is soft', async () => {
    const element = await field()
    expect(element.wrap).toBe('off')
    expect(part(element, 'layers')?.hasAttribute('data-wrap')).toBe(false)
    element.wrap = 'soft'
    await element.updateComplete
    expect(part(element, 'layers')?.hasAttribute('data-wrap')).toBe(true)
  })

  test('holds the scroller to max-rows lines', async () => {
    const element = await field('max-rows="6"')
    expect((part(element, 'scroller') as HTMLElement | null)?.style.maxBlockSize).toBe('6lh')
  })

  test('Tab types an indent, and Escape before it lets the reader leave', async () => {
    const element = await field()
    expect(press(element, 'Tab')).toBe(false)
    await element.updateComplete
    expect(element.value).toBe('  ')
    press(element, 'Escape')
    expect(press(element, 'Tab')).toBe(true)
    expect(press(element, 'Tab')).toBe(false)
  })

  test('Tab over several lines indents each, and Shift+Tab takes it away', async () => {
    const element = await field('', 'a\nb')
    control(element).setSelectionRange(0, 3)
    press(element, 'Tab')
    await element.updateComplete
    expect(element.value).toBe('  a\n  b')
    press(element, 'Tab', true)
    await element.updateComplete
    expect(element.value).toBe('a\nb')
  })

  test('Enter starts the next line at the same indent', async () => {
    const element = await field('', '  "a": 1')
    control(element).setSelectionRange(8, 8)
    expect(press(element, 'Enter')).toBe(false)
    await element.updateComplete
    expect(element.value).toBe('  "a": 1\n  ')
  })

  test('a read-only field types nothing on Tab', async () => {
    const element = await field('readonly')
    expect(press(element, 'Tab')).toBe(true)
    expect(element.value).toBe('')
  })

  test('a refused keystroke is put back, as in Textarea', async () => {
    const element = await field('', 'a')
    element.addEventListener('helix-before-change', (event) => event.preventDefault())
    press(element, 'Tab')
    await element.updateComplete
    expect(element.value).toBe('a')
    expect(control(element).value).toBe('a')
  })
})
