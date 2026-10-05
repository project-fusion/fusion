import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Who is typing, as the styled band draws it, which only a browser computes.
   Run them with `bun run specs:browser chat`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

describe('the typing indicator', () => {
  geometry('draws the dots a waiting message draws, and takes the color hook', async () => {
    const host = (await mount(
      '<helix-chat label="Support" typing="Ada" style="--chat-typing-color: rgb(1, 2, 3)"><helix-chat-message author="them" state="streaming"></helix-chat-message></helix-chat>',
    )) as HTMLElement & Updatable
    await settle(host)
    const dots = host.shadowRoot?.querySelector('[part="indicator"]') as HTMLElement
    const message = host.querySelector('helix-chat-message') as HTMLElement & Updatable
    await settle(message)
    const waiting = message.shadowRoot?.querySelector('[part="indicator"]') as HTMLElement
    expect(getComputedStyle(dots).animationName).toBe(getComputedStyle(waiting).animationName)
    expect(getComputedStyle(dots).backgroundSize).toBe(getComputedStyle(waiting).backgroundSize)
    const words = host.shadowRoot?.querySelector('[part="typing"]') as HTMLElement
    expect(getComputedStyle(words).color).toBe('rgb(1, 2, 3)')
  })
})
