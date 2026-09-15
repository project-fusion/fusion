import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import styles from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  /* The height a resize grip writes is an inline style on the textarea, and a
     sheet reaching it through `::part()` outranks that. A reset that names
     `height`, as `all: unset` does, leaves the grip dragging nothing. */
  run('takes the height the resize grip writes', async () => {
    await example(preview, styles)
    await idle()
    const host = document.querySelector('helix-headless-textarea') as HTMLElement
    const control = host.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    const before = control.getBoundingClientRect().height
    control.style.height = `${Math.round(before) + 80}px`
    expect(Math.round(control.getBoundingClientRect().height)).toBe(Math.round(before) + 80)
  })
})
