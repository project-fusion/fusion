import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the cursor example', () => {
  run('Report new places moves each pointer to its next place', async () => {
    await example(preview)
    const ada = document.getElementById('ada') as HTMLElement & { x: number; y: number }
    const grace = document.getElementById('grace') as HTMLElement & { x: number; y: number }
    ;(document.getElementById('report') as HTMLElement).click()
    await idle()
    expect([ada.x, ada.y, grace.x, grace.y]).toEqual([180, 90, 60, 150])
  })
})
