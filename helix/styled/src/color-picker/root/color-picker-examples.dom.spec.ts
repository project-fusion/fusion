import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

describe('the events example', () => {
  run('moving across the square proposes the color, announces it and commits it', async () => {
    await example(events)
    const swatch = document.getElementById('swatch') as HTMLElement & { value: string }
    const before = swatch.value
    const saturation = part(swatch, 'grid-saturation') as HTMLInputElement
    type(saturation, String(Number(saturation.value || 50) - 20))
    saturation.dispatchEvent(new Event('change', { bubbles: true }))
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
    expect(swatch.value).not.toBe(before)
  })
})
