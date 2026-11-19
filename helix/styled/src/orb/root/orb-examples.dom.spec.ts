import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import changing from '../.examples/changing.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../toggle/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the changing example', () => {
  run('choosing a state turns the orb to it', async () => {
    await example(changing)
    const orb = document.getElementById('orb') as HTMLElement & { state: string }
    const done = document.querySelector<HTMLElement>('helix-toggle[value="done"]')
    done?.click()
    await idle()
    expect(orb.state).toBe('done')
  })
})
