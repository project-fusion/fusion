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

describe('the streaming example', () => {
  run('the reply streams in, keeps the blocks it drew, and settles as sent', async () => {
    await example(streaming)
    const answer = document.getElementById('answer') as HTMLElement
    const reply = document.getElementById('reply') as HTMLElement
    await until(() => reply.children.length > 1)
    const first = reply.firstElementChild
    await until(() => answer.getAttribute('state') === 'sent')
    expect(answer.getAttribute('state')).toBe('sent')
    expect(reply.firstElementChild).toBe(first as Element)
    expect(reply.querySelector('helix-code-block')?.getAttribute('language')).toBe('sql')
    expect(reply.querySelector('helix-callout')?.getAttribute('tone')).toBe('success')
  })

  run('Replay the reply starts it again from nothing', async () => {
    await example(streaming)
    const answer = document.getElementById('answer') as HTMLElement
    await until(() => answer.getAttribute('state') === 'sent')
    ;(document.getElementById('replay') as HTMLElement).click()
    await new Promise((done) => setTimeout(done, 0))
    expect(answer.getAttribute('state')).toBe('streaming')
  })
})
