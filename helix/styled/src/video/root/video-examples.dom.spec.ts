import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import playlist_controls from '../.examples/playlist-controls.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('the next and previous controls ask, and the page hears each', async () => {
    await example(events)
    const clip = document.getElementById('clip') as HTMLElement
    ;(part(clip, 'next') as HTMLElement).click()
    await idle()
    ;(part(clip, 'previous') as HTMLElement).click()
    await idle()
    expect(logged().filter((one) => one.startsWith('helix-'))).toEqual([
      'helix-next',
      'helix-previous',
    ])
  })
})

describe('the playlist-controls example', () => {
  run('the page answers the controls by saying what was asked', async () => {
    await example(playlist_controls)
    const clip = document.getElementById('clip') as HTMLElement & { label: string }
    ;(part(clip, 'next') as HTMLElement).click()
    await idle()
    expect(clip.label).toBe('Asked for the next one')
  })
})
