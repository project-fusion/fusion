import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import hiding_a_series from '../.examples/hiding-a-series.html' with { type: 'text' }
import streaming from '../.examples/streaming.html' with { type: 'text' }
import taking_new_data from '../.examples/taking-new-data.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
  await import('../../legend/index.js')
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

describe('the taking-new-data example', () => {
  run('new numbers in the table redraw the line', async () => {
    await example(taking_new_data)
    const chart = document.querySelector('helix-line-chart') as HTMLElement
    const line = (): string | null | undefined =>
      chart.shadowRoot?.querySelector('[part~="line"]')?.getAttribute('d')
    const before = line()
    expect(before).toBeTruthy()
    ;(document.getElementById('shuffle') as HTMLElement).click()
    await idle()
    expect(line()).not.toBe(before)
  })
})

describe('the streaming example', () => {
  run('new readings arrive and the line moves with them', async () => {
    await example(streaming)
    const chart = document.querySelector('helix-line-chart') as HTMLElement
    const line = (): string | null | undefined =>
      chart.shadowRoot?.querySelector('[part~="line"]')?.getAttribute('d')
    await until(() => Boolean(line()))
    const before = line()
    await until(() => line() !== before, 3000)
    expect(line()).not.toBe(before)
  })
})

describe('the hiding-a-series example', () => {
  run('a press on a name hides its line, and the scale fits the lines left', async () => {
    await example(hiding_a_series)
    const chart = document.querySelector('helix-line-chart') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await idle()
    const top = (): string | null | undefined =>
      [...(chart.shadowRoot?.querySelectorAll('[part="tick"]') ?? [])].at(-1)?.textContent
    const before = top()
    const legend = document.querySelector('helix-legend') as HTMLElement
    const direct = [...(legend.shadowRoot?.querySelectorAll('button') ?? [])].find(
      (one) => one.textContent?.trim() === 'Direct',
    )
    direct?.click()
    await idle()
    await chart.updateComplete
    expect(direct?.getAttribute('aria-pressed')).toBe('false')
    expect(chart.shadowRoot?.querySelectorAll('[part~="line-hidden"]')).toHaveLength(1)
    expect(top()).not.toBe(before)
    expect(chart.shadowRoot?.querySelector('[part="summary"]')?.textContent).not.toContain('Direct')
  })
})
