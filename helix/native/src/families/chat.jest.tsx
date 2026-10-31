import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
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
})
