import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@helix-io/testing/dom'

/* One turn, and the four things that can have happened to it. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Message extends HTMLElement {
  at: string
  state: string
  updateComplete: Promise<unknown>
}

const message = async (attributes = '') =>
  (await mount(
    `<helix-headless-chat-message ${attributes}>What was said</helix-headless-chat-message>`,
  )) as Message

describe('the states', () => {
  test('a settled turn says nothing about itself', async () => {
    expect(part(await message('state="sent"'), 'state')).toBeNull()
  })

  test('a turn on its way says so', async () => {
    expect(part(await message('state="sending"'), 'state')?.textContent).toContain('Sending')
  })

  test('a failure offers a way back, which is a control rather than a toast', async () => {
    const element = await message('state="failed"')
    expect(part(element, 'retry')).not.toBeNull()
  })

  /**
   * Retry is `helix-send` again, from the message rather than the composer. A
   * listener telling them apart has `event.target`, which the DOM already
   * distinguishes without a second event name.
   */
  test('retry offers the turn again, and names itself as the source', async () => {
    const element = await message('state="failed"')
    const seen: Array<{ target: string; value: string }> = []
    element.addEventListener('helix-send', (event) => {
      seen.push({
        target: (event.target as HTMLElement).localName,
        value: (event as CustomEvent<{ value: string }>).detail.value,
      })
    })
    ;(part(element, 'retry') as HTMLElement).click()
    expect(seen).toEqual([{ target: 'helix-headless-chat-message', value: 'What was said' }])
  })

  /**
   * The whole of the streaming contract on this side. The live region above
   * holds its announcement until the flag clears, so a screen reader reads the
   * turn once and whole rather than token by token.
   */
  test('a streaming turn is busy while it arrives, and settles', async () => {
    const element = await message('state="streaming"')
    expect(element.hasAttribute('aria-busy')).toBe(true)
    element.state = 'sent'
    await element.updateComplete
    expect(element.hasAttribute('aria-busy')).toBe(false)
  })

  test('the state is an attribute, which is how a stylesheet knows', async () => {
    expect((await message('state="failed"')).getAttribute('state')).toBe('failed')
  })
})

describe('structure', () => {
  /**
   * `article` rather than `listitem`: the transcript is a `log`, and a log's
   * children are not list items. A turn is a self-contained thing a reader can
   * be moved to, which is what an article is for.
   */
  test('a turn is an article', async () => {
    expect(role(await message())).toBe('article')
  })

  test('no time shows no time, rather than the epoch', async () => {
    expect(part(await message(), 'time')).toBeNull()
  })

  test('the exact instant is in `datetime` whatever the reading says', async () => {
    const when = new Date(Date.now() - 120_000).toISOString()
    const element = await message(`at="${when}"`)
    expect(part(element, 'time')?.getAttribute('datetime')).toBe(when)
    expect(part(element, 'time')?.textContent).toContain('2 minutes ago')
  })

  test('the author is an attribute, since which side a turn sits on is paint', async () => {
    expect((await message('author="me"')).getAttribute('author')).toBe('me')
  })
})
