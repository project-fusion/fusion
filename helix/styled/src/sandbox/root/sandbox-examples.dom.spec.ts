import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import highlightedSource from '../.examples/highlighted-source.html' with { type: 'text' }

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
  run('an edit to the source asks first', async () => {
    await example(events)
    const source = document.querySelector('helix-sandbox-source') as HTMLElement
    const field = part(source, 'source') as HTMLTextAreaElement
    type(field, '<p>Hello, again</p>')
    await idle()
    expect(logged()).toContain('helix-before-edit')
  })
})

describe('the highlighted source example', () => {
  run('what a reader types is colored by its kind', async () => {
    await example(highlightedSource)
    const source = document.querySelector('helix-sandbox-source') as HTMLElement
    type(part(source, 'source') as HTMLTextAreaElement, '<b id="x">Bold</b>')
    await idle()
    const kinds = [...(source.shadowRoot?.querySelectorAll('[part="token"]') ?? [])].map((token) =>
      token.getAttribute('data-kind'),
    )
    expect(kinds).toEqual(['tag', 'name', 'string', 'tag'])
  })
})
