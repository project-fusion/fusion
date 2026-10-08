import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ChatTurn } from '../root/chat-root.js'

/* The turns of `turns`, which this entry draws a window at a time: what each
   carries, what a reader hears as they arrive, and where the window sits. The
   geometry is the browser suite's, since happy-dom has no box to leave a
   reader in. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('./index.js')
})

/* happy-dom's `slot.assign()` adds to what a slot holds rather than replacing
   it, which the platform does, so a claim about what is *not* assigned any more
   is only true in a browser. */
const browser = hasLayout() ? test : (): void => {}

interface Chat extends HTMLElement {
  history: string
  label: string
  meLabel: string
  messageLabel: string
  turns: readonly ChatTurn[]
  updateComplete: Promise<unknown>
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/* A child arriving is heard by an observer, a microtask later, and what it
   says is a second render after the first. */
const settle = async (element: Chat): Promise<void> => {
  await Promise.resolve()
  await element.updateComplete
  await element.updateComplete
}

const said = (element: Chat): string => part(element, 'live')?.textContent?.trim() ?? ''

/* The node the live region holds, since saying something new replaces it: the
   same words twice are two nodes, and a region left alone keeps the one it had. */
const utterance = (element: Chat): Node | undefined =>
  [...(part(element, 'live')?.childNodes ?? [])].find((node) => node.nodeType === 3)

describe('turns handed over as data', () => {
  const conversation = (count: number, from = 0): ChatTurn[] =>
    Array.from({ length: count }, (_, index) => ({
      author: (from + index) % 2 === 0 ? 'them' : 'me',
      key: `t${from + index}`,
      text: `Turn ${from + index}`,
    }))

  /* A box to window, which headless leaves to the consumer: without one the
     log is as tall as what it draws, and every turn fits. */
  const fed = async (turns: ChatTurn[], sheet = ''): Promise<Chat> => {
    const element = (await mount(
      `<helix-headless-chat label="Support"></helix-headless-chat>
      <style>helix-headless-chat::part(log) { block-size: 20rem; overflow-y: auto } ${sheet}</style>`,
    )) as Chat
    element.turns = turns
    await settle(element)
    await frame()
    return element
  }

  const drawn = (element: Chat): HTMLElement[] => [
    ...(element.shadowRoot?.querySelectorAll<HTMLElement>(
      '[part="turn"] > helix-headless-chat-message',
    ) ?? []),
  ]

  test('are drawn as messages of this tier, each with what it carries', async () => {
    const element = await fed(conversation(3))
    const messages = drawn(element)
    expect(messages.map((message) => message.textContent)).toEqual(['Turn 0', 'Turn 1', 'Turn 2'])
    expect(messages.map((message) => message.getAttribute('author'))).toEqual([
      'them',
      'me',
      'them',
    ])
  })

  test('are drawn a window at a time, with the room the rest would take', async () => {
    const element = await fed(conversation(200))
    expect(drawn(element).length).toBeGreaterThan(0)
    expect(drawn(element).length).toBeLessThan(200)
    /* Either side, since which one holds the room depends on where the window
       is: a pinned transcript in a browser opens at its end, with all of it
       above, and happy-dom has no box to have scrolled. */
    const room = (name: string): number =>
      Number.parseFloat(
        element.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`)?.style.blockSize ?? '0',
      )
    expect(room('before') + room('after')).toBeGreaterThan(0)
  })

  test('say a turn appended, and not the history prepended', async () => {
    const element = await fed(conversation(3, 10))
    expect(said(element)).toBe('')
    element.turns = [...element.turns, { author: 'them', key: 'new', text: 'Something new' }]
    await settle(element)
    expect(said(element)).toBe('Something new')
    element.turns = [
      ...element.turns,
      { author: 'them', authorLabel: 'Ada', key: 'named', text: 'Hi' },
    ]
    await settle(element)
    expect(said(element)).toBe('Ada: Hi')
    const before = utterance(element)
    element.turns = [...conversation(10), ...element.turns]
    await settle(element)
    expect(utterance(element)).toBe(before)
  })

  /* A fed turn's host is inside the chat's shadow root, so a document's
     `[author="me"]::part(body)` cannot reach it: what can is the name the chat
     forwards it under, which is all these read. */
  const forwarded = (message: HTMLElement | undefined): string[] =>
    (message?.getAttribute('exportparts') ?? '')
      .split(',')
      .map((pair) => pair.split(':').at(-1)?.trim() ?? '')
      .filter((name) => name !== '')

  const second = (message: HTMLElement | undefined): string[] =>
    forwarded(message).filter((name) => /-(mine|failed|sending|streaming)$/.test(name))

  test('forward the reader’s own turn a second time, as theirs, and nobody else’s', async () => {
    const element = await fed([
      { author: 'them', key: 'a', text: 'How can I help?' },
      { author: 'me', key: 'b', text: 'The deploy is stuck.' },
      { author: 'Ada', key: 'c', text: 'Looking now.' },
    ])
    const [theirs, mine, named] = drawn(element)
    expect(second(mine).sort()).toEqual([
      'message-avatar-mine',
      'message-body-mine',
      'message-content-mine',
      'message-meta-mine',
      'message-mine',
    ])
    /* Beside the plain names, never instead of them. */
    expect(forwarded(mine)).toContain('message-body')
    expect(second(theirs)).toEqual([])
    expect(second(named)).toEqual([])
    expect(forwarded(theirs)).toContain('message-body')
  })

  test('forward a turn’s state a second time, on the part that shows it', async () => {
    const element = await fed([
      { author: 'them', key: 'a', state: 'sent', text: 'Sent' },
      { author: 'them', key: 'b', state: 'failed', text: 'Failed' },
      { author: 'them', key: 'c', state: 'sending', text: 'Sending' },
      { author: 'them', key: 'd', state: 'streaming', text: 'Streaming' },
    ])
    expect(drawn(element).map(second)).toEqual([
      [],
      ['message-meta-failed'],
      ['message-content-sending'],
      ['message-content-streaming'],
    ])
  })

  test('forward the second name while the turn holds it, and drop it when it stops', async () => {
    const element = await fed([{ author: 'me', key: 'a', state: 'sending', text: 'Hi' }])
    expect(second(drawn(element)[0])).toContain('message-content-sending')
    element.turns = [{ author: 'me', key: 'a', state: 'sent', text: 'Hi' }]
    await settle(element)
    expect(second(drawn(element)[0])).not.toContain('message-content-sending')
    expect(second(drawn(element)[0])).toContain('message-body-mine')
  })

  test('forward only the plain names for an author the table does not hold as its own', async () => {
    /* `author` is free text, and `constructor` is a key every object answers to. */
    const element = await fed([{ author: 'constructor', key: 'a', text: 'Hi' }])
    const plain = await fed([{ author: 'them', key: 'a', text: 'Hi' }])
    expect(drawn(element)[0]?.getAttribute('exportparts')).toBe(
      drawn(plain)[0]?.getAttribute('exportparts') ?? '',
    )
  })

  test('take the declarations author-styles holds for their author, and only theirs', async () => {
    const element = await fed([
      { author: 'Ada', key: 'a', text: 'Looking now.' },
      { author: 'me', key: 'b', text: 'Thanks.' },
      { author: 'constructor', key: 'c', text: 'Hi' },
    ])
    element.setAttribute(
      'author-styles',
      '{"Ada": "--chat-message-background-color: rgb(1, 2, 3)", "me": 4}',
    )
    await settle(element)
    expect(drawn(element).map((message) => message.getAttribute('style'))).toEqual([
      '--chat-message-background-color: rgb(1, 2, 3)',
      null,
      null,
    ])
    element.setAttribute('author-styles', 'not JSON')
    await settle(element)
    expect(drawn(element)[0]?.getAttribute('style')).toBe(null)
  })

  browser(
    'a document rule on a second name reaches the reader’s own turn and no other',
    async () => {
      const element = await fed(
        [
          { author: 'them', key: 'a', text: 'How can I help?' },
          { author: 'me', key: 'b', text: 'The deploy is stuck.' },
        ],
        'helix-headless-chat::part(message-body-mine) { outline-style: dotted }',
      )
      const outline = (message: HTMLElement | undefined): string => {
        const body = message?.shadowRoot?.querySelector('[part="body"]')
        return body ? getComputedStyle(body).outlineStyle : ''
      }
      const [theirs, mine] = drawn(element)
      expect(outline(mine)).toBe('dotted')
      expect(outline(theirs)).toBe('none')
    },
  )

  browser('keep the children out of the log while there are any', async () => {
    const element = (await mount(`<helix-headless-chat label="Support">
      <helix-headless-chat-message author="them">Declared</helix-headless-chat-message>
    </helix-headless-chat>`)) as Chat
    element.turns = conversation(2)
    await settle(element)
    const slot = element.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="messages"]')
    expect(slot?.assignedElements()).toHaveLength(0)
    expect(drawn(element)).toHaveLength(2)
  })
})
