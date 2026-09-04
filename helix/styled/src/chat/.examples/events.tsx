import { useState } from 'react'

type Arrival = { carried: string; name: string }

type Turn = { said: string; when: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Send a message, then scroll the transcript', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const [turns, setTurns] = useState<Turn[]>([])

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const sent = (event: CustomEvent<{ value: string }>) => {
    say('helix-send', `"${event.detail.value}" was sent, and posting it is the page's job`)
    setTurns((before) => [...before, { said: event.detail.value, when: new Date().toISOString() }])
  }

  const pinned = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-pin', `proposing ${event.detail.value}, which follows the reader's scrolling`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-chat
        label="Support"
        onhelix-before-pin={pinned}
        onhelix-send={sent}
      >
        <strong slot="header">Support</strong>
        <helix-chat-message
          author="them"
          state="sent"
        >
          How can I help?
        </helix-chat-message>
        {turns.map((turn, at) => (
          <helix-chat-message
            at={turn.when}
            author="me"
            key={`${turn.when}-${at}`}
            state="sent"
          >
            {turn.said}
          </helix-chat-message>
        ))}
        <helix-chat-composer slot="composer" />
      </helix-chat>

      <helix-list
        divided
        label="What arrived"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
