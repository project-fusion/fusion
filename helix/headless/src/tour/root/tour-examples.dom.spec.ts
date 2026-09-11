import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('beginning opens it at the first stop, and next moves it on', async () => {
    await example(preview)
    const tour = document.querySelector('helix-headless-tour') as HTMLElement & {
      index: number
      open: boolean
    }
    const begin = document.getElementById('begin') as HTMLElement
    ;((begin.shadowRoot?.querySelector('button') ?? begin) as HTMLElement).click()
    await idle()
    expect(tour.open).toBe(true)
    expect(tour.index).toBe(0)
    const stop = document.querySelectorAll<HTMLElement>(
      'helix-headless-tour-stop',
    )[0] as HTMLElement
    const next = part(stop, 'next') as HTMLElement
    ;((next.shadowRoot?.querySelector('button') ?? next) as HTMLElement).click()
    await idle()
    expect(tour.index).toBe(1)
  })
})
