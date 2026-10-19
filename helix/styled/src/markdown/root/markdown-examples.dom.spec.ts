import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import streaming from '../.examples/streaming.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../chat/index.js')
  await import('../../flex/index.js')
})

const run = hasLayout() ? test : (): void => {}

/* Waits for what an example's own timer brings, up to a bound, so a spec reads
   the settled page rather than a guess at how long it takes. */
const until = async (ready: () => boolean, bound = 8000): Promise<void> => {
  const started = performance.now()
  while (!ready() && performance.now() - started < bound) {
    await new Promise((done) => setTimeout(done, 50))
  }
}

/* With less motion asked for, the example draws the finished reply at once,
   which is the path a spec can wait for: the streamed one takes longer than a
   browser spec is given. That a stream keeps what it drew is held by the
   headless family's own specs. */
const reducedMotion = async (body: () => Promise<void>): Promise<void> => {
  const real = window.matchMedia
  window.matchMedia = ((query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          addEventListener: () => {},
          addListener: () => {},
          dispatchEvent: () => false,
          matches: true,
          media: query,
          onchange: null,
          removeEventListener: () => {},
          removeListener: () => {},
        } as unknown as MediaQueryList)
      : real.call(window, query)) as typeof window.matchMedia
  try {
    await body()
  } finally {
    window.matchMedia = real
  }
}

describe('the streaming example', () => {
  run('with less motion asked for, the finished reply is drawn at once', async () => {
    await reducedMotion(async () => {
      await example(streaming)
      const answer = document.getElementById('answer') as HTMLElement
      const reply = document.getElementById('reply') as HTMLElement
      await until(() => answer.getAttribute('state') === 'sent', 1000)
      expect(answer.getAttribute('state')).toBe('sent')
      expect(reply.querySelector('helix-code-block')?.getAttribute('language')).toBe('sql')
      expect(reply.querySelector('helix-callout')?.getAttribute('tone')).toBe('success')
    })
  })

  run('streams the reply, and Replay the reply starts it again from nothing', async () => {
    await example(streaming)
    const answer = document.getElementById('answer') as HTMLElement
    expect(answer.getAttribute('state')).toBe('streaming')
    ;(document.getElementById('replay') as HTMLElement).click()
    expect(answer.getAttribute('state')).toBe('streaming')
    expect((document.getElementById('reply') as HTMLElement & { text: string }).text).toBe('')
  })
})
