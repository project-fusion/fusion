import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* An agent's turn: its work in the `work` slot, and its answer in the content.
   The work is a record a reader opens, and the turn is said without it. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../log/index.js')
})

type Chat = HTMLElement & { updateComplete: Promise<unknown> }
type Message = HTMLElement & { state: string; updateComplete: Promise<unknown> }

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const settle = async (element: Chat): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
}

describe('a turn’s work', () => {
  test('sits in a region above the content, hidden on a turn that has none', async () => {
    const chat = (await mount(`<helix-headless-chat label="Assistant">
      <helix-headless-chat-message author="them">
        <helix-headless-log slot="work" label="Work" quiet>
          <helix-headless-log-line>Read three files</helix-headless-log-line>
        </helix-headless-log>
        It ships today.
      </helix-headless-chat-message>
      <helix-headless-chat-message author="them">No work here.</helix-headless-chat-message>
    </helix-headless-chat>`)) as Chat
    await settle(chat)
    const [withWork, without] = [...chat.querySelectorAll<Message>('helix-headless-chat-message')]
    await withWork?.updateComplete
    await without?.updateComplete
    const work = part(withWork as Message, 'work') as HTMLElement
    expect(work.hasAttribute('hidden')).toBe(false)
    /* Above the content, with the attachments between them. */
    const content = part(withWork as Message, 'content') as HTMLElement
    expect(work.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(part(without as Message, 'work')?.hasAttribute('hidden')).toBe(true)
  })

  test('is left out of what the chat says when the turn settles', async () => {
    const chat = (await mount(`<helix-headless-chat label="Assistant">
      <helix-headless-chat-message author="me" state="sent">What changed?</helix-headless-chat-message>
    </helix-headless-chat>`)) as Chat
    await frame()
    await settle(chat)
    const turn = document.createElement('helix-headless-chat-message') as Message
    turn.setAttribute('author', 'them')
    turn.setAttribute('state', 'streaming')
    turn.innerHTML = `<helix-headless-log slot="work" label="Work" quiet>
        <helix-headless-log-line>$ git log --oneline -3</helix-headless-log-line>
      </helix-headless-log>Three things changed.`
    chat.append(turn)
    await settle(chat)
    turn.setAttribute('state', 'sent')
    await settle(chat)
    expect(part(chat, 'live')?.textContent?.trim()).toBe('Three things changed.')
  })
})
