import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }
import transcriptSheet from '../.examples/transcript.css' with { type: 'text' }
import transcript from '../.examples/transcript.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const type = (control: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}

describe('the preview example', () => {
  run('sending a message puts it in the conversation as the reader wrote it', async () => {
    await example(preview)
    const composer = document.querySelector('helix-headless-chat-composer') as HTMLElement
    const before = document.querySelectorAll('helix-headless-chat-message').length
    type(part(composer, 'field') as HTMLTextAreaElement, 'Is it the lock on the jobs table?')
    await idle()
    ;(part(composer, 'send') as HTMLElement).click()
    await idle()
    const turns = document.querySelectorAll('helix-headless-chat-message')
    expect(turns).toHaveLength(before + 1)
    expect(turns[turns.length - 1]?.textContent?.trim()).toBe('Is it the lock on the jobs table?')
  })
})

describe('the transcript example', () => {
  run('opens at the latest turn, with the reader’s own against the trailing edge', async () => {
    await example(transcript, transcriptSheet)
    const build = document.getElementById('run') as HTMLElement
    const drawn = (): HTMLElement[] => [
      ...(build.shadowRoot?.querySelectorAll<HTMLElement>('[part="turn"] > *') ?? []),
    ]
    const started = performance.now()
    while (drawn().length === 0 && performance.now() - started < 6000) {
      await new Promise((done) => setTimeout(done, 50))
    }
    await idle()
    const mine = drawn().at(-1)
    const theirs = drawn().at(-2)
    expect(mine?.textContent?.trim()).toBe('Continue from step 2000.')
    /* The sheet reaches a fed turn only through the names the chat forwards,
       so the edge a turn sits against is the second name at work. */
    const edge = (turn: HTMLElement | undefined): string => {
      const body = turn?.shadowRoot?.querySelector('[part="body"]')
      return body ? getComputedStyle(body).justifySelf : ''
    }
    expect(edge(mine)).toBe('end')
    expect(edge(theirs)).not.toBe('end')
  })
})
