import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import agent from '../.examples/agent.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import streaming from '../.examples/streaming.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../../orb/index.js')
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
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

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

const composer = (): HTMLElement => document.querySelector('helix-chat-composer') as HTMLElement

describe('the preview example', () => {
  run('sending a message puts it in the conversation as the reader wrote it', async () => {
    await example(preview)
    const before = document.querySelectorAll('helix-chat-message').length
    type(part(composer(), 'field') as HTMLTextAreaElement, 'Is it the lock on the jobs table?')
    await idle()
    ;(part(composer(), 'send') as HTMLElement).click()
    await idle()
    const turns = document.querySelectorAll('helix-chat-message')
    expect(turns).toHaveLength(before + 1)
    expect(turns[turns.length - 1]?.textContent?.trim()).toBe('Is it the lock on the jobs table?')
    expect(turns[turns.length - 1]?.getAttribute('author')).toBe('me')
  })
})

describe('the events example', () => {
  run('sending is heard from the conversation', async () => {
    await example(events)
    type(part(composer(), 'field') as HTMLTextAreaElement, 'Hello')
    await idle()
    ;(part(composer(), 'send') as HTMLElement).click()
    await idle()
    expect(logged()).toContain('helix-send')
  })
})

describe('the streaming example', () => {
  run('the answer arrives word by word and settles as sent', async () => {
    await example(streaming)
    const answer = document.getElementById('answer') as HTMLElement
    await until(() => answer.getAttribute('state') === 'sent')
    expect(answer.getAttribute('state')).toBe('sent')
    expect(answer.textContent?.trim().endsWith('tracked any more.')).toBe(true)
  })
})

describe('the agent example', () => {
  /* The animated run takes longer than a spec is given, so this takes the
     path a reader who asked for less motion gets: the reply, at once. */
  run('with less motion asked for, the reply is simply there', async () => {
    const real = window.matchMedia
    const reduced = (media: string): MediaQueryList =>
      ({
        addEventListener: () => {},
        addListener: () => {},
        dispatchEvent: () => false,
        matches: true,
        media,
        onchange: null,
        removeEventListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList
    window.matchMedia = ((query: string) =>
      query.includes('prefers-reduced-motion')
        ? reduced(query)
        : real.call(window, query)) as typeof window.matchMedia
    try {
      await example(agent)
      const reply = document.getElementById('reply') as HTMLElement
      await until(() => reply.getAttribute('state') === 'sent', 1200)
      expect(reply.getAttribute('state')).toBe('sent')
    } finally {
      window.matchMedia = real
    }
  })
})
