import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  notYetDefined,
  part,
  registerDom,
  role,
  slotted,
} from '@fusion.dev/helix-testing/dom'

/** What a named slot was actually given, which is the only proof of assignment. */
const assigned = (element: HTMLElement, name: string): Element[] =>
  element.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)?.assignedElements() ??
  []

/* The transcript after hydration.
 *
 * Scroll ownership is most of what this component is, and happy-dom has no
 * layout: `scrollHeight`, `scrollTop` and `clientHeight` are all zero, so
 * "within the threshold of the bottom" is trivially true there. The specs that
 * need real geometry are the browser suite's; what is here is everything the
 * pin *contract* is made of, which is a property, an event and a refusal, and
 * none of those need a box. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Chat extends HTMLElement {
  messages: HTMLElement[]
  pinned: boolean
  resume: () => void
  threshold: number
  updateComplete: Promise<unknown>
}

const markup = (attributes = '') => `
  <helix-headless-chat label="Support" ${attributes}>
    <helix-headless-chat-message author="them" state="sent">Hello</helix-headless-chat-message>
    <helix-headless-chat-message author="me" state="sent">Hi</helix-headless-chat-message>
    <button slot="resume">Jump to latest</button>
    <helix-headless-chat-composer slot="composer"></helix-headless-chat-composer>
  </helix-headless-chat>`

/** The same conversation with nothing but its turns, which is the bare case. */
const bare = `
  <helix-headless-chat label="Support">
    <helix-headless-chat-message author="them" state="sent">Hello</helix-headless-chat-message>
  </helix-headless-chat>`

const chat = async (attributes = '') => {
  const element = (await mount(markup(attributes))) as Chat
  await element.updateComplete
  return element
}

describe('the transcript', () => {
  /* Browser only, for a box that scrolls. Safari makes no scroller a tab stop,
     so a keyboard there could not reach a long history. */
  test.skipIf(!hasLayout())('the log is a tab stop while it scrolls', async () => {
    const element = await chat('style="display: block; block-size: 160px"')
    const log = part(element, 'log') as HTMLElement
    log.style.blockSize = '100%'
    log.style.overflow = 'auto'
    for (let at = 0; at < 30; at += 1) {
      const turn = document.createElement('helix-headless-chat-message')
      turn.setAttribute('author', 'them')
      turn.setAttribute('state', 'sent')
      turn.textContent = `Line ${at}`
      element.append(turn)
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
    await element.updateComplete
    expect(log.scrollHeight).toBeGreaterThan(log.clientHeight)
    expect(log.getAttribute('tabindex')).toBe('0')
  })

  /* Browser only, for a box that scrolls. Pinned, the log follows the bottom
     on every update, and a smooth scroll sent again each time never arrived:
     in WebKit, a log that had streamed for a second under
     `scroll-behavior: smooth` rested 6 pixels short of the bottom. */
  test.skipIf(!hasLayout())(
    'follows the bottom at once, whatever scroll-behavior the page sets',
    async () => {
      const element = await chat('style="display: block; block-size: 160px"')
      const log = part(element, 'log') as HTMLElement
      log.style.blockSize = '100%'
      log.style.overflow = 'auto'
      log.style.scrollBehavior = 'smooth'
      for (let at = 0; at < 30; at += 1) {
        const turn = document.createElement('helix-headless-chat-message')
        turn.setAttribute('author', 'them')
        turn.setAttribute('state', 'sent')
        turn.textContent = `Line ${at}`
        element.append(turn)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
      await element.updateComplete
      expect(element.pinned).toBe(true)
      expect(log.scrollHeight - log.clientHeight - log.scrollTop).toBeLessThan(1)
    },
  )

  /* Browser only, for a box that scrolls. WebKit moves the log through an
     arrow key's animation before its scroll event arrives, and an update in
     between put the reader's turn back by writing the old offset over theirs:
     four presses moved a log 40 pixels while a turn streamed, against 80 at
     rest. The move here is made the same way, with no event yet. */
  test.skipIf(!hasLayout())(
    'leaves a scroll whose event has not arrived where the reader took it',
    async () => {
      const element = await chat('style="display: block; block-size: 160px"')
      const log = part(element, 'log') as HTMLElement
      log.style.blockSize = '100%'
      log.style.overflow = 'auto'
      for (let at = 0; at < 30; at += 1) {
        const turn = document.createElement('helix-headless-chat-message')
        turn.setAttribute('author', 'them')
        turn.setAttribute('state', 'sent')
        turn.textContent = `Line ${at}`
        element.append(turn)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
      await element.updateComplete
      log.scrollTop = 200
      log.dispatchEvent(new Event('scroll'))
      await element.updateComplete
      expect(element.pinned).toBe(false)

      log.scrollTop = 260
      ;(element as Chat & { requestUpdate: () => void }).requestUpdate()
      await element.updateComplete
      expect(log.scrollTop).toBe(260)
    },
  )

  /* A transcript that fits was no stop at all, so a conversation whose turns
     held no control had no way into them by keyboard. */
  test('the log is a tab stop while it holds a turn, so Page Down can enter them', async () => {
    const short = await chat()
    expect(part(short, 'log')?.getAttribute('tabindex')).toBe('0')
    const empty = (await mount(
      '<helix-headless-chat label="Support"></helix-headless-chat>',
    )) as Chat
    await empty.updateComplete
    expect(part(empty, 'log')?.hasAttribute('tabindex')).toBe(false)
  })

  test('the host is a named region, and the log is a log that says nothing itself', async () => {
    const element = await chat()
    expect(role(element)).toBe('region')
    const log = part(element, 'log')
    expect(log?.getAttribute('role')).toBe('log')
    /* Off, because what enters a log is not what is new: history, a window
       moving and every token of a stream all enter it. The live part says the
       turns that are, and `chat-transcript.dom.spec.ts` holds it to that. */
    expect(log?.getAttribute('aria-live')).toBe('off')
    expect(part(element, 'live')?.getAttribute('role')).toBe('status')
  })

  test('the turns declared as children are the transcript', async () => {
    expect((await chat()).messages).toHaveLength(2)
  })

  /**
   * A region nobody filled is not laid out, and this element is the only party
   * that can say so.
   *
   * The slots are assigned by hand, so a filled slot has no more children than
   * an empty one and no stylesheet can tell them apart with `:has()`. Left to
   * CSS, a chat with no header drew a hairline under nothing and a chat with no
   * composer drew one over nothing, 25 pixels of chrome each.
   */
  test('a region nobody filled is hidden, and a filled one is not', async () => {
    const empty = (await mount(bare)) as Chat
    await empty.updateComplete
    expect(part(empty, 'header')?.hasAttribute('hidden')).toBe(true)
    expect(part(empty, 'composer')?.hasAttribute('hidden')).toBe(true)
    const filled = await chat()
    expect(part(filled, 'composer')?.hasAttribute('hidden')).toBe(false)
  })

  /**
   * A status region separate from the log, so "somebody is typing" never
   * interleaves with what was said. A live region that carries both announces
   * them in the order they changed, which is not the order they matter in.
   */
  test('the status region is not part of the log', async () => {
    const element = await chat()
    expect(part(element, 'status')?.getAttribute('role')).toBe('status')
    expect(part(element, 'log')?.querySelector('[part="status"]')).toBeNull()
  })

  test('and it is there before anything is said in it', async () => {
    /* Hidden while empty, it was out of the accessibility tree, and the first
       "is typing" arrived in a region appearing with it, which a screen reader
       may not read. */
    const element = await chat()
    expect(part(element, 'status')?.hasAttribute('hidden')).toBe(false)
    expect(part(element, 'status')?.hasAttribute('data-empty')).toBe(true)
  })

  test('fetching older turns is said through the region that is always there', async () => {
    const element = await chat()
    ;(element as unknown as { history: string; historyText: string }).historyText = 'Fetching'
    ;(element as unknown as { history: string }).history = 'loading'
    await element.updateComplete
    expect(part(element, 'live')?.textContent?.trim()).toBe('Fetching')
    expect(part(element, 'history')?.hasAttribute('role')).toBe(false)
  })

  test('an empty conversation says so rather than showing a blank box', async () => {
    const element = (await mount('<helix-headless-chat></helix-headless-chat>')) as Chat
    await element.updateComplete
    expect(part(element, 'empty')).not.toBeNull()
  })
})

describe('the pin', () => {
  test('a conversation opens at its most recent turn', async () => {
    expect((await chat()).pinned).toBe(true)
  })

  test('`default-pinned="false"` opens away from the bottom, as written', async () => {
    /* A boolean attribute is true by being there, so a default of true had no
       attribute that turned it off, and this markup opened pinned. */
    const element = await chat('default-pinned="false"')
    expect(element.pinned).toBe(false)
  })

  test('and opening unpinned is a property too', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    expect(element.pinned).toBe(false)
  })

  /**
   * The way back is a slot, so the control offering it is the consumer's and
   * needs something to call. It pins again on the way, which is what a reader
   * asking to go to the bottom means.
   */
  test('resume pins again', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    element.resume()
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })

  test('the way back is offered only while the reader is away from the bottom', async () => {
    const element = await chat()
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(true)
    element.pinned = false
    await element.updateComplete
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(false)
  })

  /**
   * The way back goes back on its own.
   *
   * The control is slotted so a consumer picks the words, and `resume()` is
   * public for them to call, but a press in a region that exists for one purpose
   * means that purpose: without this the element positions, lifts, shows and
   * hides a button that does nothing.
   */
  test('a press in the way back pins again', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    part(element, 'resume')?.dispatchEvent(new Event('click', { bubbles: true }))
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })

  /**
   * And a page that slotted nothing still gets one.
   *
   * The way back was a slot with nothing in it, so a consumer who never filled
   * it had no way back at all: the region stayed hidden on every unpin. The
   * slot's fallback is a button that does what the region does.
   */
  test('a way back nobody slotted is a button named by resume-label', async () => {
    const element = (await mount(bare)) as Chat
    await element.updateComplete
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(true)
    element.pinned = false
    await element.updateComplete
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(false)
    const button = part(element, 'resume-button') as HTMLButtonElement
    expect(button.textContent?.trim()).toBe('Jump to latest')
    button.click()
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })

  /**
   * The handler is on the transcript, and this is what says so.
   *
   * `scroll` is not composed, so an event dispatched inside the shadow root has
   * a path that stops at the root and never includes the host: a capture
   * listener on the host, which is where this lived, saw nothing ever. There is
   * no layout here, so the transcript always reports itself at the bottom, which
   * is enough: unpin by hand, send the platform's own event shape at the log, and
   * a handler that runs pins again. A handler that does not run leaves it alone,
   * which is what happened for as long as it was bound to the host.
   */
  test('a scroll on the transcript reaches the handler, unlike one on the host', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    part(element, 'log')?.dispatchEvent(new Event('scroll'))
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })

  /**
   * A conversation grows, and nothing else tells this element that it did.
   *
   * The slots are assigned by hand, so appending a child assigns it to nothing
   * and fires no `slotchange`: the transcript kept rendering the turns it had at
   * first paint and showed its empty state over children it already held.
   */
  test('a turn appended after the first render reaches the transcript', async () => {
    const element = await chat()
    const before = element.messages.length
    const turn = document.createElement('helix-headless-chat-message')
    turn.textContent = 'arrived later'
    element.append(turn)
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    await element.updateComplete
    expect(element.messages).toHaveLength(before + 1)
    expect(assigned(element, 'messages')).toHaveLength(before + 1)
  })

  /**
   * `helix-before-pin` is Chat's own verb rather than a generic change, so a
   * listener binding the name is binding something with one meaning.
   */
  test('a pin change is announced as a change to `pinned`', async () => {
    const element = await chat()
    const seen: Array<{ value: string }> = []
    element.addEventListener('helix-before-pin', (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail)
    })
    element.pinned = false
    await element.updateComplete
    element.resume()
    expect(seen).toEqual([{ value: 'true' }])
  })

  /* The request is a proposal another listener may refuse, so a consumer
     following the pin needs the notification after it. */
  test('a pin that stood is announced again once it has happened', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    const heard: string[] = []
    element.addEventListener('helix-pin', (event) => {
      heard.push(`${(event as CustomEvent<{ value: string }>).detail.value}@${element.pinned}`)
      expect(event.cancelable).toBe(false)
    })
    element.resume()
    expect(heard).toEqual(['true@true'])
  })

  test('and a refused one is not', async () => {
    const element = await chat()
    element.pinned = false
    await element.updateComplete
    element.addEventListener('helix-before-pin', (event) => event.preventDefault())
    let heard = false
    element.addEventListener('helix-pin', () => {
      heard = true
    })
    element.resume()
    expect(heard).toBe(false)
    expect(element.pinned).toBe(false)
  })

  /**
   * A reflected property with a truthy default writes its attribute on upgrade
   * whether or not the consumer wrote one, so the server serves one set of
   * attributes and the client another. Nothing needs it here: the one thing that
   * changes with the pin is the way back, and that is a part inside the shadow
   * tree.
   */
  test('the pin writes no attribute the server did not', async () => {
    const element = await chat()
    expect([...element.attributes].map((one) => one.name)).toEqual(['label'])
  })

  test('a declared `pinned` makes the element defer to the consumer', async () => {
    const element = await chat('pinned')
    element.resume()
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })
})

/* What a transcript says where there is nothing in it, and while it is
 * fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what a chat counts as having rows: it is fed either by a `turns`
 * property or by slotted messages, and the expression takes both, so a chat
 * that got it wrong says "Nothing to show" over a full conversation.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('what the conversation is doing, as states a stylesheet can match', () => {
  /* A sheet that dims the header while history loads, or marks the frame while
     someone types, needed the property itself, which no selector reaches. */
  test('pinned, typing, loading and empty follow what they name', async () => {
    const element = await chat()
    expect(hasState(element, 'pinned')).toBe(true)
    expect(hasState(element, 'typing')).toBe(false)
    expect(hasState(element, 'loading')).toBe(false)
    expect(hasState(element, 'empty')).toBe(false)
    element.pinned = false
    element.setAttribute('typing', 'Ada')
    element.setAttribute('history', 'loading')
    await element.updateComplete
    expect(hasState(element, 'pinned')).toBe(false)
    expect(hasState(element, 'typing')).toBe(true)
    expect(hasState(element, 'loading')).toBe(true)
    const empty = (await mount(
      '<helix-headless-chat label="Support"></helix-headless-chat>',
    )) as Chat
    await empty.updateComplete
    expect(hasState(empty, 'empty')).toBe(true)
  })
})

describe('turns given both ways', () => {
  /* The rule was written down and nothing held a page to it. */
  test('are reported once, naming how many came each way', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const element = (await mount(markup())) as Chat & { turns: unknown[] }
      element.turns = [{ author: 'them', text: 'From data' }]
      await element.updateComplete
      element.turns = [...element.turns, { author: 'me', text: 'Again' }]
      await element.updateComplete
      expect(warnings.filter((one) => one.includes('as children'))).toHaveLength(1)
      expect(warnings.find((one) => one.includes('as children'))).toContain('2 turns as children')
    } finally {
      console.warn = original
    }
  })
})

/* `core` ships `[data-scroller] { overflow: auto }`. Before the mark the
   overflow came from the styled sheet, so pinning, history and the window did
   nothing on a page that loads only the headless tier. */
describe('the transcript on the headless tier', () => {
  test('marks the log as the box it scrolls', async () => {
    const element = (await mount(markup())) as Chat
    await element.updateComplete
    expect(part(element, 'log')?.hasAttribute('data-scroller')).toBe(true)
  })
})

describe('a transcript with nothing in it', () => {
  test('says the consumer’s words once it has looked', async () => {
    const host = await mount(
      '<helix-headless-chat label="Support" empty-text="Nothing here yet"></helix-headless-chat>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    const host = await mount(
      '<helix-headless-chat label="Support" loading loading-text="Still fetching"></helix-headless-chat>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(host, 'empty')).toBeNull()
  })
})

describe('the other side typing', () => {
  test('draws three dots and who is typing in the status band, and takes them away', async () => {
    const element = (await mount(markup())) as Chat & { typing: string; typingLabel: string }
    await element.updateComplete
    expect(part(element, 'typing')).toBeNull()
    element.typing = 'Ada'
    await element.updateComplete
    const status = part(element, 'status') as HTMLElement
    expect(status.hasAttribute('data-empty')).toBe(false)
    expect(part(element, 'typing')?.textContent?.trim()).toBe('Ada is typing')
    expect(part(element, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
    // Inside the band's own region, so a screen reader hears the words.
    expect(status.contains(part(element, 'typing'))).toBe(true)
    element.typingLabel = '{author} schreibt'
    await element.updateComplete
    expect(part(element, 'typing')?.textContent?.trim()).toBe('Ada schreibt')
    element.typing = ''
    await element.updateComplete
    expect(part(element, 'typing')).toBeNull()
    expect(status.hasAttribute('data-empty')).toBe(true)
  })
})

describe('moving between turns', () => {
  const page = (from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      ...init,
    })
    from.dispatchEvent(event)
    return event
  }
  const three = `
    <helix-headless-chat label="Support">
      <helix-headless-chat-message author="them" state="sent">One</helix-headless-chat-message>
      <helix-headless-chat-message author="me" state="sent">Two</helix-headless-chat-message>
      <helix-headless-chat-message author="them" state="sent">Three</helix-headless-chat-message>
      <helix-headless-chat-composer slot="composer"></helix-headless-chat-composer>
    </helix-headless-chat>`

  /* A reader moving through a long conversation had no keys between turns,
     only Tab through their controls. The feed's keys go turn to turn. */
  test('Page Down and Page Up move focus from turn to turn', async () => {
    const element = (await mount(three)) as Chat
    await element.updateComplete
    const turns = [...element.querySelectorAll('helix-headless-chat-message')] as HTMLElement[]
    const [first, second, third] = turns as [HTMLElement, HTMLElement, HTMLElement]
    // From the transcript itself, focus goes to the turn at the top of the view.
    expect(page(part(element, 'log') as Element, 'PageDown').defaultPrevented).toBe(true)
    await Promise.resolve()
    expect(turns).toContain(document.activeElement as HTMLElement)
    page(second, 'PageUp')
    expect(document.activeElement?.textContent).toBe(first.textContent)
    page(first, 'PageDown')
    expect(document.activeElement?.textContent).toBe(second.textContent)
    page(second, 'PageDown')
    page(third, 'PageDown')
    expect(document.activeElement?.textContent).toBe(third.textContent)
    page(third, 'PageUp')
    expect(document.activeElement?.textContent).toBe(second.textContent)
    /* Only the turn a reader is on is a stop, and as `0`: a host at `-1`
       takes its slotted links and its own Try again out of the Tab order. */
    expect(second.getAttribute('tabindex')).toBe('0')
    expect(turns.filter((turn) => turn.hasAttribute('tabindex'))).toEqual([second])
  })

  /* Chromium skips the whole of a shadow host at `tabindex="-1"` when it
     walks the Tab order, so a turn a reader had paged through lost its link
     and its Try again, and Tab from before the chat went past both. */
  test('a turn a reader paged through keeps its controls in the Tab order', async () => {
    const element = (await mount(`
      <helix-headless-chat label="Support">
        <helix-headless-chat-message author="them" state="sent">See <a href="#docs">the docs</a></helix-headless-chat-message>
        <helix-headless-chat-message author="me" state="failed">Two</helix-headless-chat-message>
        <helix-headless-chat-message author="them" state="sent">Three</helix-headless-chat-message>
      </helix-headless-chat>`)) as Chat
    await element.updateComplete
    const [first, second, third] = [
      ...element.querySelectorAll('helix-headless-chat-message'),
    ] as HTMLElement[] as [HTMLElement, HTMLElement, HTMLElement]
    page(first.querySelector('a') as HTMLElement, 'PageDown')
    page(second, 'PageDown')
    page(third, 'PageUp')
    page(second, 'PageUp')
    for (const turn of [first, second, third]) {
      expect(turn.getAttribute('tabindex')).not.toBe('-1')
    }
  })

  /* A transcript that fits has nothing below to jump to, so moving to an
     older turn leaves it pinned and draws no way back. */
  test('moving to an older turn of a transcript that does not scroll leaves it pinned', async () => {
    const element = (await mount(three)) as Chat
    await element.updateComplete
    const [, second, third] = [
      ...element.querySelectorAll('helix-headless-chat-message'),
    ] as HTMLElement[] as [HTMLElement, HTMLElement, HTMLElement]
    const log = part(element, 'log') as HTMLElement
    expect(log.scrollHeight).toBe(log.clientHeight)
    page(third, 'PageUp')
    page(second, 'PageUp')
    await element.updateComplete
    expect(element.pinned).toBe(true)
  })

  /* Measured in Chromium before this: removing the turn that held focus left
     focus on the body, and Page Down did nothing until the reader tabbed back
     in. List and Virtual List move focus to a neighbor. */
  test('removing the turn that holds focus moves focus to the one in its place', async () => {
    const element = (await mount(three)) as Chat
    await element.updateComplete
    const [first, second, third] = [
      ...element.querySelectorAll('helix-headless-chat-message'),
    ] as HTMLElement[] as [HTMLElement, HTMLElement, HTMLElement]
    page(first, 'PageDown')
    expect(document.activeElement).toBe(second)
    second.remove()
    await element.updateComplete
    await element.updateComplete
    expect(document.activeElement).toBe(third)
    /* The last one gives focus to the turn before it. */
    third.remove()
    await element.updateComplete
    await element.updateComplete
    expect(document.activeElement).toBe(first)
  })

  test('and from turns given as data', async () => {
    const element = (await mount(
      '<helix-headless-chat label="Support"></helix-headless-chat>',
    )) as Chat & {
      turns: { author: string; key: string; text: string }[]
    }
    element.turns = ['One', 'Two', 'Three'].map((text) => ({ author: 'them', key: text, text }))
    await element.updateComplete
    await element.updateComplete
    const drawn = (text: string): HTMLElement | undefined =>
      [...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="turn"] > *') ?? [])].find(
        (turn) => turn.textContent?.trim() === text,
      )
    ;(drawn('One') as HTMLElement).focus()
    page(drawn('One') as HTMLElement, 'PageDown')
    await element.updateComplete
    expect(element.shadowRoot?.activeElement).toBe(drawn('Two'))
    element.turns = element.turns.filter((turn) => turn.text !== 'Two')
    await element.updateComplete
    await element.updateComplete
    await element.updateComplete
    expect(element.shadowRoot?.activeElement).toBe(drawn('Three'))
  })

  test('Control with End leaves for the composer', async () => {
    const element = (await mount(three)) as Chat
    await element.updateComplete
    const turn = element.querySelector('helix-headless-chat-message') as HTMLElement
    const event = page(turn, 'End', { ctrlKey: true })
    expect(event.defaultPrevented).toBe(true)
    const composer = element.querySelector('helix-headless-chat-composer') as HTMLElement
    expect(composer.contains(document.activeElement) || document.activeElement === composer).toBe(
      true,
    )
  })

  test('each turn says its place in the conversation', async () => {
    const element = (await mount(three)) as Chat
    await element.updateComplete
    await Promise.resolve()
    const turns = [...element.querySelectorAll('helix-headless-chat-message')] as unknown as Array<
      HTMLElement & { internals: ElementInternals; updateComplete: Promise<unknown> }
    >
    await Promise.all(turns.map((one) => one.updateComplete))
    expect(turns.map((one) => one.internals.ariaPosInSet)).toEqual(['1', '2', '3'])
    expect(turns.map((one) => one.internals.ariaSetSize)).toEqual(['3', '3', '3'])
  })
})

describe('a message whose definition loads after it was added', () => {
  /* The host hears the definition from `whenDefined`, a microtask after it,
     and both elements then render. */
  const upgraded = async (...elements: Element[]): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      await Promise.all(
        elements.map((one) => (one as Element & { updateComplete?: unknown }).updateComplete),
      )
    }
  }
  /* The transcript is assigned by hand to the messages it recognizes, and an
     element that has not upgraded is not one yet. In a browser a visible chat
     was rescued by its resize observer; a hidden one was not. */
  test('is drawn in the transcript once it upgrades, while the chat is hidden', async () => {
    const chat = await mount(
      '<helix-headless-chat label="Conversation" hidden><helix-headless-chat-message author="them" state="sent">Hello</helix-headless-chat-message></helix-headless-chat>',
    )
    const late = notYetDefined('helix-headless-chat-message')
    /* No `state`: it reflects, and the chat's own watch on that attribute would
       read the transcript again for a reason unrelated to the upgrade. */
    late.element.textContent = 'Hi'
    chat.append(late.element)
    await upgraded(chat)
    late.define()
    await upgraded(chat, late.element)
    expect(slotted(chat, 'messages').includes(late.element)).toBe(true)
  })
})

describe('an update that changes no turn', () => {
  /* Every slot keeps what it holds. In WebKit an assignment that changed
     nothing stopped a scroll running in the log, and the log updates on every
     token of a streaming turn: the arrow keys moved it no distance at all while
     one streamed. */
  test('assigns no slot again', async () => {
    const element = (await chat()) as Chat & { requestUpdate: () => void }
    const assign = HTMLSlotElement.prototype.assign
    let calls = 0
    HTMLSlotElement.prototype.assign = function (this: HTMLSlotElement, ...nodes) {
      calls += 1
      assign.apply(this, nodes)
    }
    try {
      element.requestUpdate()
      await element.updateComplete
    } finally {
      HTMLSlotElement.prototype.assign = assign
    }
    expect(calls).toBe(0)
  })
})
