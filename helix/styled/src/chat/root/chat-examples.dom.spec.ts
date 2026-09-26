import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  idle,
  logged,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import historySheet from '../.examples/history.css' with { type: 'text' }
import history from '../.examples/history.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import agent from '../.examples/reply-with-steps.html' with { type: 'text' }
import streaming from '../.examples/streaming.html' with { type: 'text' }
import transcriptSheet from '../.examples/transcript.css' with { type: 'text' }
import transcript from '../.examples/transcript.html' with { type: 'text' }

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

const composer = (): Updatable => document.querySelector('helix-chat-composer') as Updatable

/* **The two sends below settle the composer, and do not idle.** The words are
   the composer's the moment `input` arrives, and a press sends them and the
   page appends its turn before `click()` returns, so the composer's own update
   is all there is left. Six frames a step on top of it bought nothing, and a
   busy run could not always find them inside the two seconds a test gets. */
describe('the preview example', () => {
  run('sending a message puts it in the conversation as the reader wrote it', async () => {
    await example(preview)
    const before = document.querySelectorAll('helix-chat-message').length
    type(part(composer(), 'field') as HTMLTextAreaElement, 'Is it the lock on the jobs table?')
    await settle(composer())
    ;(part(composer(), 'send') as HTMLElement).click()
    await settle(composer())
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
    await settle(composer())
    ;(part(composer(), 'send') as HTMLElement).click()
    await settle(composer())
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

describe('the history example', () => {
  run('reaching the top loads the turns before it, and the reader stays on theirs', async () => {
    await example(history, historySheet)
    const thread = document.getElementById('thread') as HTMLElement & { history: string }
    const reading = thread.querySelector('helix-chat-message') as HTMLElement
    ;(part(thread, 'log') as HTMLElement).scrollTop = 0
    await until(() => thread.history === 'loading')
    const before = reading.getBoundingClientRect().top
    await until(() => thread.querySelectorAll('helix-chat-message').length === 12)
    await idle()
    expect(Math.abs(reading.getBoundingClientRect().top - before)).toBeLessThan(2)
    expect(thread.history).toBe('more')
  })
})

describe('the transcript example', () => {
  run('two thousand turns open at the latest, drawn a window at a time', async () => {
    await example(transcript, transcriptSheet)
    const build = document.getElementById('run') as HTMLElement
    const drawn = (): Element[] => [...(build.shadowRoot?.querySelectorAll('[part="turn"]') ?? [])]
    await until(() => drawn().length > 0)
    await idle()
    expect(drawn().length).toBeLessThan(60)
    expect(drawn().at(-1)?.textContent?.trim()).toBe('Continue from step 2000.')
  })
})
