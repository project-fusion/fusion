import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import sheet from '../.examples/preview.css' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('two thousand rows draw only the handful on screen, first row first', async () => {
    /* With the example's own sheet, which gives the viewport its height. The
       spec passed without it only while another file's sheet stayed in the
       page. */
    await example(preview, sheet)
    await idle()
    const drawn = document.querySelectorAll('.virtualRow')
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.length).toBeLessThan(200)
    expect(drawn[0]?.textContent).toContain('Row 1')
  })
})
