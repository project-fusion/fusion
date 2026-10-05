import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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
   * And only while there is one to offer.
   *
   * The way back is a slot, so a consumer who never filled it has no control to
   * show and the region is a box with a negative top margin over the transcript:
   * revealing it on every unpin moved the composer without putting anything on
   * screen.
   */
  test('a way back nobody slotted is never offered', async () => {
    const element = (await mount(bare)) as Chat
    await element.updateComplete
    element.pinned = false
    await element.updateComplete
    expect(part(element, 'resume')?.hasAttribute('hidden')).toBe(true)
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
