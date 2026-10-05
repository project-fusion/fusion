import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* One turn, and the four things that can have happened to it. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Message extends HTMLElement {
  at: string
  authorLabel: string
  internals?: ElementInternals
  state: string
  updateComplete: Promise<unknown>
}

const message = async (attributes = '') =>
  (await mount(
    `<helix-headless-chat-message ${attributes}>What was said</helix-headless-chat-message>`,
  )) as Message

/** A turn built from whole markup, for the cases that are about what is slotted. */
const turn = async (inner: string, attributes = '') => {
  const element = (await mount(
    `<helix-headless-chat-message ${attributes}>${inner}</helix-headless-chat-message>`,
  )) as Message
  await element.updateComplete
  return element
}

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
   * The mark is not there because color needs a second carrier: "Not sent" is
   * words, so the meaning survives without it. It is there because a failure is
   * the one state that has to be *found* rather than noticed, and a shape is
   * what a reader scanning a transcript finds. It carries the accessible name
   * from the library's one status vocabulary, so it says "Error" rather than
   * "danger", which is the word the API uses and not the word a reader knows.
   */
  test('a failure is marked as well as worded, and the mark says Error', async () => {
    const element = await message('state="failed"')
    const mark = part(element, 'mark')
    expect(mark).not.toBeNull()
    expect(mark?.getAttribute('role')).toBe('img')
    expect(mark?.getAttribute('aria-label')).toBe('Error')
  })

  test('no other state takes a mark, since none of them has to be found', async () => {
    expect(part(await message('state="sending"'), 'mark')).toBeNull()
    expect(part(await message('state="sent"'), 'mark')).toBeNull()
    expect(part(await message('state="streaming"'), 'mark')).toBeNull()
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

  /* The whole `textContent` carried what was slotted beside the words, so a
     retry sent "Where is my order?CopyOrder page". */
  test('retry offers the words and none of the controls or sources beside them', async () => {
    const element = await turn(
      'Where is my order?<button slot="actions">Copy</button><a slot="sources" href="#o">Order page</a>',
      'state="failed"',
    )
    let value = ''
    element.addEventListener('helix-send', (event) => {
      value = (event as CustomEvent<{ value: string }>).detail.value
    })
    ;(part(element, 'retry') as HTMLElement).click()
    expect(value).toBe('Where is my order?')
  })

  /**
   * A retry that stands is a turn on its way, which is what `sending` means.
   * Without it the reader pressed the control and the turn sat at "Not sent"
   * with the same control still on it.
   */
  test('a retry nobody refused puts the turn back on its way', async () => {
    const element = await message('state="failed"')
    ;(part(element, 'retry') as HTMLElement).click()
    await element.updateComplete
    expect(element.state).toBe('sending')
    expect(part(element, 'retry')).toBeNull()
    expect(part(element, 'state')?.textContent).toContain('Sending')
  })

  /**
   * And the half that makes the veto real. `helix-send` is cancelable because
   * the composer clears only when nobody refused; this dispatch read nothing
   * back, so `preventDefault()` here was valid code, raised no error, and took
   * a decision nobody was about to make.
   */
  test('and refusing it leaves the failure and its control where they were', async () => {
    const element = await message('state="failed"')
    element.addEventListener('helix-send', (event) => event.preventDefault())
    ;(part(element, 'retry') as HTMLElement).click()
    await element.updateComplete
    expect(element.state).toBe('failed')
    expect(part(element, 'retry')).not.toBeNull()
  })

  /**
   * The whole of the streaming contract on this side. The live region above
   * holds its announcement until the flag clears, so a screen reader reads the
   * turn once and whole rather than token by token.
   *
   * **Asked of internals, and the host is asserted bare beside it.** The flag
   * was written as an attribute, which is markup a consumer's server never sent
   * and which React reports on hydration; this is `Skeleton`'s pair, asserting
   * the tree has it and the markup does not.
   */
  test('a streaming turn is busy while it arrives, and settles', async () => {
    const element = await message('state="streaming"')
    expect(element.internals?.ariaBusy).toBe('true')
    expect(element.hasAttribute('aria-busy')).toBe(false)
    element.state = 'sent'
    await element.updateComplete
    expect(element.internals?.ariaBusy).toBeNull()
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

describe('what a turn was drawn from, and what can be done with it', () => {
  /**
   * Both are regions that cost a gap when they are boxes at all, and most turns
   * should pay for neither. No selector can ask whether a slot was filled, since
   * assigned nodes are not a slot's DOM children, so the element asks with
   * `slotFilled` and says so where a stylesheet can read it.
   */
  test('sources and actions are laid out only when something is in them', async () => {
    const bare = await turn('What was said')
    expect(part(bare, 'sources')?.hasAttribute('hidden')).toBe(true)
    expect(part(bare, 'actions')?.hasAttribute('hidden')).toBe(true)

    const cited = await turn(
      'What was said<span slot="sources">runbook.md</span><button slot="actions">Copy</button>',
    )
    expect(part(cited, 'sources')?.hasAttribute('hidden')).toBe(false)
    expect(part(cited, 'actions')?.hasAttribute('hidden')).toBe(false)
  })

  /**
   * The controls sit inside `meta`, which is the line under a turn rather than
   * only its timestamp. A column of their own put them under the middle of the
   * bubble, because a spanning grid item inflates every track it spans.
   */
  test('the controls are on the line under the turn, beside its time', async () => {
    const element = await turn(
      'Said<button slot="actions">Copy</button>',
      'at="2026-08-27T09:00:00.000Z"',
    )
    expect(part(element, 'meta')?.querySelector('[part="actions"]')).not.toBeNull()
  })
})

describe('the wait before the first token', () => {
  /**
   * A turn marked `streaming` with nothing in it yet is the one moment a
   * transcript has nothing to show, and an empty bubble is indistinguishable
   * from a bug. `data-empty` on the content is what the typing indicator is
   * drawn from, and it has to clear the moment the first token lands.
   */
  test('an empty streaming turn marks its content, and stops when content arrives', async () => {
    const element = await turn('', 'state="streaming"')
    expect(part(element, 'content')?.hasAttribute('data-empty')).toBe(true)
    /* And the content box stays, unlike the other two: the indicator is painted
       into it. */
    expect(part(element, 'content')?.hasAttribute('hidden')).toBe(false)

    element.append(document.createTextNode('The migration is waiting'))
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(part(element, 'content')?.hasAttribute('data-empty')).toBe(false)
  })
})

describe('the name a screen reader gives the turn', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

  /**
   * An article is never named by its content, so a turn with no name was
   * heard as "article" and a reader had to read each one to learn who wrote
   * it.
   */
  test('a turn by me is named "You" and its time', async () => {
    const element = await message(`author="me" at="${ago(120_000)}"`)
    expect(label(element)).toBe('You, 2 minutes ago')
  })

  test('the author label names the turn, whoever the author is', async () => {
    const element = await message(`author="them" author-label="Support" at="${ago(120_000)}"`)
    expect(label(element)).toBe('Support, 2 minutes ago')
  })

  test('an author written as a name is the name', async () => {
    expect(label(await message('author="Grace Hopper"'))).toBe('Grace Hopper')
  })

  test('a turn by them with no label is named by its time alone', async () => {
    expect(label(await message(`author="them" at="${ago(120_000)}"`))).toBe('2 minutes ago')
  })

  test('a turn with no author and no time takes no name, rather than an empty one', async () => {
    expect(label(await message())).toBeNull()
  })

  test('the label follows a change', async () => {
    const element = await message('author="them"')
    element.authorLabel = 'Ada'
    await element.updateComplete
    expect(label(element)).toBe('Ada')
  })
})

describe('the time moves on', () => {
  interface Ticker {
    waiting: Set<{ at: number; run: () => void }>
  }
  const ticker = () =>
    (globalThis as unknown as Record<symbol, Ticker | undefined>)[Symbol.for('helix.ticker')]
  const realNow = Date.now

  afterEach(() => {
    Date.now = realNow
  })

  /**
   * The reading was computed once, when `at` was set, so a transcript left
   * open said "now" for the rest of the session. The turn asks the shared
   * ticker for the moment its words go stale and reads the clock again then.
   */
  test('a reading that goes stale is read again, and its name with it', async () => {
    const said = Date.now() - 30_000
    const element = await message(`author="me" at="${new Date(said).toISOString()}"`)
    expect(part(element, 'time')?.textContent).toBe('now')
    const waiting = [...(ticker()?.waiting ?? [])]
    expect(waiting.length).toBeGreaterThan(0)
    Date.now = () => said + 61_000
    for (const one of waiting) {
      one.run()
    }
    await element.updateComplete
    expect(part(element, 'time')?.textContent).toBe('1 minute ago')
    expect(label(element)).toBe('You, 1 minute ago')
  })

  test('a turn taken off the page stops asking', async () => {
    const element = await message(`at="${new Date().toISOString()}"`)
    const before = ticker()?.waiting.size ?? 0
    element.remove()
    expect(ticker()?.waiting.size ?? 0).toBeLessThan(before)
  })
})
