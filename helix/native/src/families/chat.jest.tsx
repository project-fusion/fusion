import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { HelixRoot } from '../index'
import { HelixChat, HelixChatComposer, HelixChatMessage } from './chat/index.native'

type Drawn = (given: Record<string, unknown>) => React.ReactNode
const Chat = HelixChat as unknown as Drawn
const Composer = HelixChatComposer as unknown as Drawn
const Message = HelixChatMessage as unknown as Drawn

const TURNS = [
  { author: 'them', authorLabel: 'Ada', key: 'a', text: 'Hello' },
  { author: 'me', key: 'b', text: 'Hi Ada' },
]

interface Node {
  readonly children: readonly (Node | string)[] | null
  readonly props: Record<string, unknown>
  readonly type: string
}

/** A node's style as one object. */
const flat = (node: { props: Record<string, unknown> } | null | undefined) =>
  (StyleSheet.flatten(node?.props.style as never) ?? {}) as Record<string, unknown>

/** Every host node the screen draws, outermost first. */
const drawn = (): Node[] => {
  const all: Node[] = []
  const walk = (one: Node | string | readonly Node[] | null) => {
    if (one === null || typeof one === 'string') {
      return
    }
    if (Array.isArray(one)) {
      one.forEach(walk)
      return
    }
    const node = one as Node
    all.push(node)
    node.children?.forEach(walk)
  }
  walk(screen.toJSON() as Node | null)
  return all
}

/**
 * A line of a turn in outline: an empty view in a skeleton's fill, 8% of the ink.
 * A message's bubble has that fill too, and holds its words.
 */
const isLine = (node: Node | string): boolean =>
  typeof node !== 'string' &&
  (node.children ?? []).length === 0 &&
  /^rgba\(\d+, \d+, \d+, 0\.08\)$/.test(String(flat(node).backgroundColor))

/** The turns in outline, each a view holding only lines, and the wrapper around them. */
const outline = () => {
  const all = drawn()
  const turns = all.filter(
    (node) => (node.children ?? []).length > 0 && node.children?.every(isLine),
  )
  const wrapper = all.find((node) => turns.length > 0 && node.children?.includes(turns[0] as Node))
  return { lines: all.filter(isLine), turns, wrapper }
}

describe('Chat on a phone', () => {
  test('draws turns from data, and names each by its author', async () => {
    await render(
      <HelixRoot>
        <Chat label="Support" turns={TURNS} />
      </HelixRoot>,
    )
    expect(await screen.findByText('Hello')).toBeTruthy()
    expect(screen.getByText('Hi Ada')).toBeTruthy()
    expect(screen.getByLabelText('Ada')).toBeTruthy()
    expect(screen.getByLabelText('You')).toBeTruthy()
  })

  test('draws turns passed in', async () => {
    await render(
      <HelixRoot>
        <Chat label="Support">
          <Message author="them" authorLabel="Ada">
            Hello
          </Message>
        </Chat>
      </HelixRoot>,
    )
    expect(await screen.findByText('Hello')).toBeTruthy()
  })

  test('a failed turn offers a retry, which the chat hears and which sets it sending', async () => {
    const onSend = jest.fn()
    await render(
      <HelixRoot>
        <Chat label="Support" onSend={onSend}>
          <Message author="me" state="failed">
            Where is my order?
          </Message>
        </Chat>
      </HelixRoot>,
    )
    await fireEvent.press(await screen.findByText('Try again'))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Sending')).toBeTruthy()
  })

  test('a composer sends its draft, clears, and keeps it where a handler refuses', async () => {
    const sent: string[] = []
    let refuse = true
    const onSend = (event: { detail: { value: string }; preventDefault: () => void }) => {
      sent.push(event.detail.value)
      if (refuse) {
        event.preventDefault()
      }
    }
    await render(
      <HelixRoot>
        <Composer label="Message" onSend={onSend} />
      </HelixRoot>,
    )
    const field = await screen.findByLabelText('Message')
    await fireEvent.changeText(field, ' hello ')
    await fireEvent.press(screen.getByLabelText('Send'))
    expect(sent).toEqual(['hello'])
    expect(screen.getByLabelText('Message').props.value).toBe(' hello ')
    refuse = false
    await fireEvent.press(screen.getByLabelText('Send'))
    expect(screen.getByLabelText('Message').props.value).toBe('')
  })

  test('says who is typing', async () => {
    await render(
      <HelixRoot>
        <Chat label="Support" typing="Ada" />
      </HelixRoot>,
    )
    expect(await screen.findByText('Ada is typing')).toBeTruthy()
  })

  test('loading with no turns draws two turns in outline, and keeps the loading words for a screen reader', async () => {
    await render(
      <HelixRoot>
        <Chat label="Support" loading />
      </HelixRoot>,
    )
    const words = await screen.findByText('Loading', { includeHiddenElements: true })
    expect(flat(words.parent).position).toBe('absolute')
    expect(flat(words.parent).width).toBe(1)
    expect(words.parent?.props.accessibilityElementsHidden).toBeUndefined()
    const { lines, turns, wrapper } = outline()
    expect(wrapper?.props.accessibilityElementsHidden).toBe(true)
    expect(turns.map((turn) => turn.children?.length)).toEqual([1, 3])
    const [mine, reply] = turns
    expect(flat(mine).alignSelf).toBe('flex-end')
    expect(flat(mine).borderRadius).toBeGreaterThan(0)
    expect(flat(mine).width).toBeLessThan(Number(flat(reply).width))
    expect(flat(reply).alignSelf).toBeUndefined()
    expect(flat(reply).maxWidth).toBe('80%')
    expect(lines.map((line) => flat(line).width)).toEqual([undefined, undefined, undefined, '60%'])
  })

  test('draws no outline over turns it has, nor once it has loaded', async () => {
    const view = await render(
      <HelixRoot>
        <Chat label="Support" loading turns={TURNS} />
      </HelixRoot>,
    )
    expect(await screen.findByText('Hello')).toBeTruthy()
    expect(outline().lines).toHaveLength(0)
    await view.rerender(
      <HelixRoot>
        <Chat label="Support" loading>
          <Message author="them">Hello</Message>
        </Chat>
      </HelixRoot>,
    )
    expect(outline().lines).toHaveLength(0)
    await view.rerender(
      <HelixRoot>
        <Chat label="Support" />
      </HelixRoot>,
    )
    expect(outline().lines).toHaveLength(0)
  })

  test('a turn takes the fill `author-styles` writes as a mix of a token', async () => {
    await render(
      <HelixRoot>
        <Chat
          authorStyles={{
            Ada: '--chat-message-background-color: color-mix(in oklab, var(--helix-color-success) 24%, transparent)',
          }}
          label="Release"
          turns={[{ author: 'Ada', authorLabel: 'Ada', key: '1', text: 'Green' }]}
        />
      </HelixRoot>,
    )
    const fill = StyleSheet.flatten(
      screen.getByText('Green', { includeHiddenElements: true }).parent?.props.style,
    ) as {
      backgroundColor?: string
    }
    expect(fill.backgroundColor).toMatch(/^rgba\(\d+, \d+, \d+, 0\.24\)$/)
  })
})
