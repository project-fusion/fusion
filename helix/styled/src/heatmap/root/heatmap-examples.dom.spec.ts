import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import growing_in from '../.examples/growing-in.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* Waits for what an example's own timer or the network brings, up to a bound,
   so a spec reads the settled page rather than a guess at how long it takes. */
const until = async (ready: () => boolean, bound = 6000): Promise<void> => {
  const started = performance.now()
  while (!ready() && performance.now() - started < bound) {
    await new Promise((done) => setTimeout(done, 50))
  }
}

describe('the events example', () => {
  run('narrowing it past what a column needs is heard as a resize', async () => {
    await example(events)
    const grid = document.getElementById('grid') as HTMLElement
    grid.style.inlineSize = '300px'
    await until(() => logged().includes('helix-resize'), 1200)
    await idle()
    expect(logged()).toContain('helix-resize')
  })
})

/** Presses the example's button with these words. */
const press = (words: string): void => {
  const button = [...document.querySelectorAll('helix-button')].find(
    (one) => one.textContent?.trim() === words,
  )
  ;(button as HTMLElement).click()
}

describe('the growing-in example', () => {
  run('adding a day takes in the new day and lets the oldest go', async () => {
    await example(growing_in)
    const chart = document.querySelector('helix-heatmap') as HTMLElement
    const overview = (): string | null | undefined =>
      chart.shadowRoot?.querySelector('[part="overview"]')?.textContent
    const before = overview()
    expect(before).toBeTruthy()
    press('Add a day')
    await idle()
    expect(overview()).not.toBe(before)
  })
})
