import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, label, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ChatTurn } from './chat-root.js'

/* What a transcript says, what it asks for, and what it draws from data. The
   geometry of each, where the reader is left after history loads or a turn
   grows, is the browser suite's, since happy-dom has no box to leave them in. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

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

/* happy-dom's `slot.assign()` adds to what a slot holds rather than replacing
   it, which the platform does, so a claim about what is *not* assigned any more
   is only true in a browser. */
const browser = hasLayout() ? test : (): void => {}

const turn = (author: string, text: string, state = 'sent'): HTMLElement => {
  const message = document.createElement('helix-headless-chat-message')
  message.setAttribute('author', author)
  message.setAttribute('state', state)
  message.textContent = text
  return message
}

const opened = async (attributes = ''): Promise<Chat> => {
  const element = (await mount(`<helix-headless-chat label="Support" ${attributes}>
    <helix-headless-chat-message author="them" state="sent">Hello</helix-headless-chat-message>
    <helix-headless-chat-message author="me" state="sent">Hi</helix-headless-chat-message>
  </helix-headless-chat>`)) as Chat
  await frame()
  await element.updateComplete
  return element
}

describe('what a transcript says', () => {
  test('nothing of the turns it opened with', async () => {
    const element = await opened()
    expect(said(element)).toBe('')
  })

  test('a turn from somebody else, when it arrives', async () => {
    const element = await opened()
    element.append(turn('them', 'How can I help?'))
    await settle(element)
    expect(said(element)).toBe('How can I help?')
  })

  test('not the reader’s own turn, which they have just written', async () => {
    const element = await opened()
    element.append(turn('me', 'Thanks'))
    await settle(element)
    expect(said(element)).toBe('')
  })

  test('the reader’s own turn when it did not send, in the words the turn shows', async () => {
    const element = await opened()
    const mine = turn('me', 'Thanks', 'sending')
    element.append(mine)
    await settle(element)
    expect(said(element)).toBe('')
    mine.setAttribute('state', 'failed')
    await settle(element)
    expect(said(element)).toBe('Not sent: Thanks')
  })

  test('a stream once, whole, when it settles, and never a token of it', async () => {
    const element = await opened()
    const heard = new Set<string>()
    const answer = turn('them', '', 'streaming')
    element.append(answer)
    for (const text of ['Three', 'Three things', 'Three things.']) {
      answer.textContent = text
      await settle(element)
      heard.add(said(element))
    }
    answer.setAttribute('state', 'sent')
    await settle(element)
    heard.add(said(element))
    element.label = 'Support, again'
    await settle(element)
    heard.add(said(element))
    expect([...heard]).toEqual(['', 'Three things.'])
  })

  test('not the turns loaded above the ones already there', async () => {
    const element = await opened()
    element.prepend(turn('them', 'Older'), turn('them', 'Oldest'))
    await settle(element)
    expect(said(element)).toBe('')
  })

  test('turns that arrive together, in the order they arrived', async () => {
    const element = await opened()
    element.append(turn('them', 'One.'), turn('them', 'Two.'))
    await settle(element)
    expect(said(element)).toBe('One. Two.')
  })

  test('the words of a turn, and not the controls slotted beside them', async () => {
    const element = await opened()
    const answer = turn('them', 'Answer')
    answer.insertAdjacentHTML('afterbegin', '<button slot="actions">Copy</button>')
    element.append(answer)
    await settle(element)
    expect(said(element)).toBe('Answer')
  })

  test('the same words twice as two things said, not one', async () => {
    /* A status region whose text did not change is a region with nothing new
       in it, so "Yes" after "Yes" would be heard once. */
    const element = await opened()
    element.append(turn('them', 'Yes'))
    await settle(element)
    const first = utterance(element)
    element.append(turn('them', 'Yes'))
    await settle(element)
    expect(said(element)).toBe('Yes')
    expect(utterance(element)).not.toBe(first)
  })
})

describe('history', () => {
  const asks = (): { count: number } => {
    const seen = { count: 0 }
    document.addEventListener('helix-history', () => {
      seen.count += 1
    })
    return seen
  }

  test('reaching the top with more to load asks for it, once per arrival', async () => {
    const seen = asks()
    const element = await opened('history="more"')
    expect(seen.count).toBe(1)
    element.label = 'Support, again'
    await settle(element)
    expect(seen.count).toBe(1)
    /* The consumer fetched, found the box still not full, and said so: still at
       the top, so it asks again rather than leaving the reader short. */
    element.history = 'loading'
    await settle(element)
    element.history = 'more'
    await settle(element)
    expect(seen.count).toBe(2)
  })

  test('asks for nothing at the start of a conversation, or while it is loading', async () => {
    const seen = asks()
    await opened()
    await opened('history="loading"')
    expect(seen.count).toBe(0)
  })

  test('says it is loading, above the oldest turn, and marks the log busy', async () => {
    const element = await opened('history="loading"')
    const log = part(element, 'log') as HTMLElement
    const notice = part(element, 'history')
    expect(notice?.textContent?.trim()).toBe('Loading earlier messages')
    // A line to see, and not a region: it is said through the one that is always there.
    expect(notice?.hasAttribute('role')).toBe(false)
    expect(log.firstElementChild).toBe(notice)
    expect(log.getAttribute('aria-busy')).toBe('true')
  })
})

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

describe('the name of each turn', () => {
  const ago = new Date(Date.now() - 120_000).toISOString()

  /**
   * The chat holds the sentence and the word for `me`, so a page in another
   * language sets them once. A turn written as a child hears them from the
   * chat, after it has hydrated.
   */
  test('a turn written as a child is named in the chat’s words', async () => {
    const element = (await mount(`<helix-headless-chat label="Support" me-label="Vous"
      message-label="{author} ({time})">
      <helix-headless-chat-message author="me" at="${ago}">Bonjour</helix-headless-chat-message>
    </helix-headless-chat>`)) as Chat
    await settle(element)
    const message = element.querySelector('helix-headless-chat-message') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await message.updateComplete
    expect(label(message)).toBe('Vous (2 minutes ago)')

    element.meLabel = 'Moi'
    await settle(element)
    await message.updateComplete
    expect(label(message)).toBe('Moi (2 minutes ago)')
  })

  test('a turn handed over as data is named by its author label', async () => {
    const element = (await mount(
      '<helix-headless-chat label="Support"></helix-headless-chat>',
    )) as Chat
    element.turns = [
      { at: ago, author: 'them', authorLabel: 'Support', key: 'a', text: 'Hello' },
      { at: ago, author: 'me', key: 'b', text: 'Hi' },
    ]
    await settle(element)
    await frame()
    const drawn = [
      ...(element.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete: Promise<unknown> }>(
        '[part="turn"] > helix-headless-chat-message',
      ) ?? []),
    ]
    await Promise.all(drawn.map((message) => message.updateComplete))
    expect(drawn.map((message) => label(message))).toEqual([
      'Support, 2 minutes ago',
      'You, 2 minutes ago',
    ])
  })
})
