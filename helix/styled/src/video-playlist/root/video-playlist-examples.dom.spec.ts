import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../video/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const press = (item: Element | null): void => {
  ;(part(item as HTMLElement, 'item') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('choosing another clip asks to activate it, then says it moved', async () => {
    await example(events)
    press(document.querySelector('helix-video-playlist-item[value="two"]'))
    await idle()
    expect(logged()).toEqual(['helix-before-activate', 'helix-activate'])
  })
})

describe('the controlled example', () => {
  run('a choice asks, and the page moves the clip it holds', async () => {
    await example(controlled)
    press(document.querySelector('helix-video-playlist-item[value="one"]'))
    await idle()
    expect((document.getElementById('episodes') as HTMLElement & { active: string }).active).toBe(
      'one',
    )
  })
})
