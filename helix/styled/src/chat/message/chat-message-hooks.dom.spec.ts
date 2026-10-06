import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What a turn's hooks change, which only a browser computes. Run them with
   `bun run specs:browser chat`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Chat = HTMLElement & Updatable & { turns: readonly { author: string; text: string }[] }

const content = (message: Element | undefined): CSSStyleDeclaration =>
  getComputedStyle(message?.shadowRoot?.querySelector('[part="content"]') as HTMLElement)

describe('chat message hooks', () => {
  geometry(
    'the bubble takes its radius, padding and colors, and keeps its look without them',
    async () => {
      const plain = (await mount(
        '<helix-chat-message author="me">Hi</helix-chat-message>',
      )) as HTMLElement & Updatable
      await settle(plain)
      const before = content(plain)
      const was = {
        color: before.color,
        padding: before.paddingInlineStart,
        radius: before.borderTopLeftRadius,
      }
      const hooked = (await mount(
        '<helix-chat-message author="me" style="--chat-message-radius: 3px; --chat-message-padding-inline: 5px; --chat-message-padding-block: 6px; --chat-message-color-me: rgb(1, 2, 3); --chat-message-meta-color: rgb(4, 5, 6)" at="2026-01-01T00:00:00Z">Hi</helix-chat-message>',
      )) as HTMLElement & Updatable
      await settle(hooked)
      const after = content(hooked)
      expect(after.borderTopLeftRadius).toBe('3px')
      expect(after.paddingInlineStart).toBe('5px')
      expect(after.paddingBlockStart).toBe('6px')
      expect(after.color).toBe('rgb(1, 2, 3)')
      const meta = hooked.shadowRoot?.querySelector('[part="meta"]') as HTMLElement
      expect(getComputedStyle(meta).color).toBe('rgb(4, 5, 6)')
      expect(was).not.toEqual({ color: 'rgb(1, 2, 3)', padding: '5px', radius: '3px' })
    },
  )

  geometry(
    'a turn from data takes the declarations author-styles holds for its author',
    async () => {
      const chat = (await mount(
        `<helix-chat label="Support" author-styles='{"Ada": "--chat-message-background-color: rgb(7, 8, 9)"}'></helix-chat>`,
      )) as Chat
      chat.turns = [
        { author: 'Ada', text: 'Looking now.' },
        { author: 'Grace', text: 'Me too.' },
      ]
      await settle(chat)
      const [ada, grace] = [...(chat.shadowRoot?.querySelectorAll('[part="turn"] > *') ?? [])]
      await settle(ada as HTMLElement & Updatable)
      await settle(grace as HTMLElement & Updatable)
      expect(content(ada).backgroundColor).toBe('rgb(7, 8, 9)')
      expect(content(grace).backgroundColor).not.toBe('rgb(7, 8, 9)')
    },
  )
})
