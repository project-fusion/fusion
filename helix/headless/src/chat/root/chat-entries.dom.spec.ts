import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * The composer and the turns drawn from `turns` are entries of their own, so a
 * transcript that uses neither carries none of their code. A chat holding a
 * composer nobody registered, or given `turns` without the entry that draws
 * them, says which entry to import.
 */

beforeAll(async () => {
  registerDom()
  const { HelixHeadlessChat } = await import('../index.js')
  /* A chat class no entry has added anything to, as a page that imported none
     has, since the specs of this family share one registry. Its own tier, so
     its composer is a tag nothing registers. */
  customElements.define(
    'bare-chat',
    class extends HelixHeadlessChat {
      static drawTurns = undefined
      static override tier = 'bare-'
    },
  )
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

type Chat = HTMLElement & { turns: { text: string }[]; updateComplete: Promise<boolean> }

describe('a chat without the entries', () => {
  test('draws its children alone when given turns, and says which entry to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const chat = (await mount(
      '<bare-chat label="Support"><helix-headless-chat-message author="them">Hi</helix-headless-chat-message></bare-chat>',
    )) as Chat
    chat.turns = [{ text: 'From data' }]
    await chat.updateComplete
    expect(chat.shadowRoot?.querySelector('[part="turn"]')).toBeNull()
    await painted()
    expect(warnings).toEqual([
      "<bare-chat> was given `turns`, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/chat/turns'.",
    ])
  })

  test('says which entry registers a composer it holds', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    await mount(
      '<bare-chat label="Support"><bare-chat-composer slot="composer"></bare-chat-composer></bare-chat>',
    )
    await painted()
    expect(warnings).toEqual([
      "<bare-chat-composer> in <bare-chat> is not registered, so nobody can write a turn. Import '@fusion.dev/helix-headless/chat/composer'.",
    ])
  })
})
