import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* Where the reader is left: after a turn grows under them, after history loads
   above them, and inside a transcript too long to draw. Every claim is about a
   box, so every one is the browser's. Run them with
   `bun run specs:browser chat`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

interface Turn {
  author?: string
  key?: string
  text: string
}

interface Chat extends HTMLElement {
  history: string
  pinned: boolean
  turns: readonly Turn[]
  updateComplete: Promise<unknown>
}

/* A resize observer reports on the frame after layout, and a window settles
   over a few renders, so a position is read after both. */
const frames = async (element: Chat, count = 4): Promise<void> => {
  for (let pass = 0; pass < count; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await element.updateComplete
  }
}

const log = (element: Chat): HTMLElement => part(element, 'log') as HTMLElement
const fromBottom = (element: Chat): number => {
  const box = log(element)
  return box.scrollHeight - box.scrollTop - box.clientHeight
}
const top = (turn: Element | null | undefined): number =>
  turn?.getBoundingClientRect().top ?? Number.NaN

const LINE = 'The retries are hitting the old endpoint, so the rollback is the fix for now.'

const conversation = async (count = 12, attributes = ''): Promise<Chat> => {
  const turns = Array.from(
    { length: count },
    (_, index) =>
      `<helix-chat-message author="${index % 2 ? 'me' : 'them'}" state="sent">${index}. ${LINE}</helix-chat-message>`,
  ).join('')
  const element = (await mount(
    `<helix-chat label="Support" style="--chat-max-block-size: 16rem" ${attributes}>${turns}</helix-chat>`,
  )) as Chat
  await frames(element)
  return element
}

describe('a pinned transcript', () => {
  geometry('follows a turn that grows, to its last line', async () => {
    const element = await conversation()
    expect(fromBottom(element)).toBeLessThan(2)
    const last = element.querySelector('helix-chat-message:last-of-type') as HTMLElement
    for (let pass = 0; pass < 6; pass++) {
      last.textContent = `${last.textContent} ${LINE}`
      await frames(element, 2)
    }
    expect(fromBottom(element)).toBeLessThan(2)
    expect(element.pinned).toBe(true)
  })

  geometry('stays pinned when a turn grows by more than the threshold at once', async () => {
    /* Growth fires no scroll of its own, but the next scroll this element makes
       reads a bottom that has moved. Read as the reader leaving, a code block
       arriving in one piece would let go of every reader it was meant to hold. */
    const element = await conversation()
    const last = element.querySelector('helix-chat-message:last-of-type') as HTMLElement
    last.textContent = Array.from({ length: 12 }, () => LINE).join(' ')
    log(element).dispatchEvent(new Event('scroll'))
    await frames(element)
    expect(element.pinned).toBe(true)
    expect(fromBottom(element)).toBeLessThan(2)
  })

  geometry('lets go when the reader scrolls up', async () => {
    const element = await conversation()
    log(element).scrollTop = 0
    await frames(element)
    expect(element.pinned).toBe(false)
  })
})

describe('history loading above the reader', () => {
  geometry('leaves the turn they were reading where they were reading it', async () => {
    /* At the very top, which is where history is asked for and where Chromium's
       own scroll anchoring stands aside: anywhere below it the browser keeps the
       turn in place by itself, and this would pass with nothing here doing it. */
    const element = await conversation(12, 'history="more"')
    const box = log(element)
    box.scrollTop = 0
    await frames(element)
    const reading = element.querySelectorAll('helix-chat-message')[1]
    const before = top(reading)

    element.history = 'loading'
    await frames(element)
    expect(Math.abs(top(reading) - before)).toBeLessThan(2)

    const older = Array.from({ length: 5 }, (_, index) => {
      const turn = document.createElement('helix-chat-message')
      turn.setAttribute('author', 'them')
      turn.textContent = `Older ${index}. ${LINE}`
      return turn
    })
    element.prepend(...older)
    element.history = 'more'
    await frames(element)
    expect(Math.abs(top(reading) - before)).toBeLessThan(2)
    expect(box.scrollTop).toBeGreaterThan(100)
  })

  geometry('asks once the reader reaches the top, and not before', async () => {
    const element = await conversation(12, 'history="more"')
    let asked = 0
    element.addEventListener('helix-history', () => {
      asked += 1
    })
    log(element).scrollTop = 200
    await frames(element)
    expect(asked).toBe(0)
    log(element).scrollTop = 0
    await frames(element)
    expect(asked).toBe(1)
  })
})

describe('a transcript fed as data', () => {
  const turns = (count: number, from = 0): Turn[] =>
    Array.from({ length: count }, (_, index) => ({
      author: (from + index) % 3 === 0 ? 'me' : 'them',
      key: `t${from + index}`,
      text:
        (from + index) % 4 === 0
          ? `${from + index}. ${LINE} ${LINE} ${LINE}`
          : `${from + index}. ${LINE}`,
    }))

  const fed = async (count: number): Promise<Chat> => {
    const element = (await mount(
      '<helix-chat label="Build" style="--chat-max-block-size: 20rem"></helix-chat>',
    )) as Chat
    element.turns = turns(count)
    await frames(element, 8)
    return element
  }

  const drawn = (element: Chat): HTMLElement[] => [
    ...(element.shadowRoot?.querySelectorAll<HTMLElement>('[part="turn"]') ?? []),
  ]
  const turnAt = (element: Chat, key: string): HTMLElement | undefined =>
    drawn(element).find((turn) => turn.textContent?.trim().startsWith(`${key.slice(1)}.`))

  geometry('opens at its latest turn, having drawn only a window', async () => {
    const element = await fed(2000)
    expect(drawn(element).length).toBeLessThan(60)
    expect(fromBottom(element)).toBeLessThan(2)
    const last = drawn(element).at(-1)
    expect(last?.textContent?.trim().startsWith('1999.')).toBe(true)
    const bottom = log(element).getBoundingClientRect().bottom
    expect(Math.abs((last?.getBoundingClientRect().bottom ?? 0) - bottom)).toBeLessThan(24)
  })

  geometry('keeps the turn under the reader when history is prepended', async () => {
    const element = await fed(300)
    const box = log(element)
    box.scrollTop = 120
    box.dispatchEvent(new Event('scroll'))
    await frames(element, 6)
    const reading = drawn(element).find(
      (turn) => turn.getBoundingClientRect().top > box.getBoundingClientRect().top,
    )
    const key = `t${reading?.textContent?.trim().split('.')[0]}`
    const before = top(reading)

    element.turns = [...turns(100, -100), ...element.turns]
    await frames(element, 6)
    expect(Math.abs(top(turnAt(element, key)) - before)).toBeLessThan(2)
  })

  geometry('places a turn scrolled to by what the turns above it measured', async () => {
    /* Row n is named n, so the name and the index are checked against each
       other: a window that drifted from its placement draws a name that does
       not match the index it claims. */
    const element = await fed(2000)
    const box = log(element)
    box.scrollTop = Math.floor(box.scrollHeight / 2)
    box.dispatchEvent(new Event('scroll'))
    await frames(element, 8)
    for (const turn of drawn(element)) {
      expect(turn.textContent?.trim().startsWith(`${turn.dataset.index}.`)).toBe(true)
    }
    const visible = drawn(element).filter((turn) => {
      const rect = turn.getBoundingClientRect()
      const frame = box.getBoundingClientRect()
      return rect.bottom > frame.top && rect.top < frame.bottom
    })
    expect(visible.length).toBeGreaterThan(0)
  })
})

describe('what is said', () => {
  geometry('is out of sight and still in the accessibility tree', async () => {
    const element = await conversation(2)
    const live = part(element, 'live') as HTMLElement
    const rect = live.getBoundingClientRect()
    expect(getComputedStyle(live).display).not.toBe('none')
    expect(rect.width).toBeLessThanOrEqual(1)
    expect(rect.height).toBeLessThanOrEqual(1)
  })
})
