import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import arriving from '../.examples/arriving.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/** Presses the example's button with these words. */
const press = (words: string): void => {
  const button = [...document.querySelectorAll('helix-button')].find(
    (one) => one.textContent?.trim() === words,
  )
  ;(button as HTMLElement).click()
}

describe('the arriving example', () => {
  run('each deploy joins at the top, and past four the oldest leaves', async () => {
    await example(arriving)
    const titles = (): string[] =>
      [...document.querySelectorAll('helix-timeline-item helix-text')].map(
        (one) => one.textContent?.trim() ?? '',
      )
    press('Deploy')
    await idle()
    expect(titles()).toHaveLength(4)
    expect(titles()[0]).toBe('Deployed version 4.2.1')
    press('Deploy')
    await idle()
    expect(titles()).toEqual([
      'Deployed version 4.2.2',
      'Deployed version 4.2.1',
      'Deployed version 4.2.0',
      'Rolled back',
    ])
  })
})
