import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { ChatTurn } from './chat-root.js'

/**
 * Chat on the words registry: the conversation, its turns and its composer
 * speak the words registered for the page's language, a turn's time reads in
 * it, and a turn that did not send is said in one sentence.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Chat = Updatable & { turns: readonly ChatTurn[]; typing: string }

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const settle = async (element: Updatable): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
}

const said = (element: Chat): string => part(element, 'live')?.textContent?.trim() ?? ''

const chat = async (around = '', inside = ''): Promise<Chat> => {
  document.body.innerHTML = `<div ${around}><helix-headless-chat>
    <helix-headless-chat-message author="them" state="sent">Hello</helix-headless-chat-message>
    ${inside}
  </helix-headless-chat></div>`
  const host = document.querySelector('helix-headless-chat') as Chat
  await frame()
  await settle(host)
  return host
}

const GERMAN = {
  'helix-chat': {
    failedTurnLabel: '{text} ({failed})',
    fallbackLabel: 'Unterhaltung',
    typingLabel: '{author} schreibt',
  },
  'helix-chat-composer': { sendLabel: 'Senden' },
  'helix-chat-message': { failedLabel: 'Nicht gesendet', retryLabel: 'Erneut versuchen' },
}

describe('a chat on a page in another language', () => {
  test('names the conversation and says who is typing in the words registered for it', async () => {
    registerWords('de', GERMAN)
    const host = await chat('lang="de"')
    expect(part(host, 'log')?.getAttribute('aria-label')).toBe('Unterhaltung')
    host.typing = 'Ada'
    await settle(host)
    expect(part(host, 'typing')?.textContent?.trim()).toBe('Ada schreibt')
  })

  test('says a turn that did not send in one sentence the language orders', async () => {
    registerWords('de', GERMAN)
    const host = await chat('lang="de"')
    const mine = document.createElement('helix-headless-chat-message')
    mine.setAttribute('author', 'me')
    mine.setAttribute('state', 'sending')
    mine.textContent = 'Danke'
    host.append(mine)
    await settle(host)
    mine.setAttribute('state', 'failed')
    await settle(host)
    expect(said(host)).toBe('Danke (Nicht gesendet)')
    await settle(mine as unknown as Updatable)
    expect(part(mine, 'retry')?.textContent?.trim()).toBe('Erneut versuchen')
  })

  test('reads a turn’s time in the language of the page', async () => {
    const when = new Date(Date.now() - 120_000).toISOString()
    const host = await chat(
      'lang="de"',
      `<helix-headless-chat-message author="them" at="${when}">Hallo</helix-headless-chat-message>`,
    )
    const message = host.querySelectorAll('helix-headless-chat-message')[1] as HTMLElement
    await settle(message as unknown as Updatable)
    expect(part(message, 'time')?.textContent).toContain('vor 2 Minuten')
  })

  test('names the composer’s button with the words registered for it', async () => {
    registerWords('de', GERMAN)
    document.body.innerHTML =
      '<div lang="de"><helix-headless-chat-composer></helix-headless-chat-composer></div>'
    const composer = document.querySelector('helix-headless-chat-composer') as Updatable
    await settle(composer)
    const send = part(composer, 'send')
    expect(send?.getAttribute('aria-label') ?? send?.textContent?.trim()).toBe('Senden')
  })
})

describe('the sentences a chat says in English', () => {
  test('name the conversation as before', async () => {
    const host = await chat()
    expect(part(host, 'log')?.getAttribute('aria-label')).toBe('Conversation')
  })

  test('say a turn from `turns` that did not send as before, and draw it with the chat’s word', async () => {
    registerWords('de', GERMAN)
    document.body.innerHTML = '<helix-headless-chat label="Support"></helix-headless-chat>'
    const host = document.querySelector('helix-headless-chat') as Chat
    host.turns = [{ author: 'me', key: 'a', state: 'sending', text: 'Hi' }]
    await settle(host)
    await frame()
    host.turns = [{ author: 'me', key: 'a', state: 'failed', text: 'Hi' }]
    await settle(host)
    await frame()
    await settle(host)
    expect(said(host)).toBe('Not sent: Hi')
    const drawn = host.shadowRoot?.querySelector('[part="turn"] > helix-headless-chat-message')
    await settle(drawn as unknown as Updatable)
    expect(part(drawn as HTMLElement, 'state')?.textContent).toContain('Not sent')
  })
})
