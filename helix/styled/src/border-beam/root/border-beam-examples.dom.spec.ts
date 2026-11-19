import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import idleExample from '../.examples/idle.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../card/index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the idle example', () => {
  run('the button stops the light and starts it again, and the words say which', async () => {
    await example(idleExample)
    const sync = document.getElementById('sync') as HTMLElement & { idle: boolean }
    const toggle = document.getElementById('toggle') as HTMLElement
    toggle.click()
    await idle()
    expect(sync.idle).toBe(true)
    expect(sync.hasAttribute('idle')).toBe(true)
    expect(document.getElementById('sync-text')?.textContent).toBe('Sync stopped.')
    expect(toggle.textContent).toBe('Start syncing')
    toggle.click()
    await idle()
    expect(sync.idle).toBe(false)
    expect(toggle.textContent).toBe('Stop syncing')
  })
})
