import { useState } from 'react'

type Arrival = { carried: string; name: string }

type Turn = { said: string; when: string }

// The number of rows the log keeps.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Send a message, then scroll the transcript', name: 'No events yet' },
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
    say('helix-send', `"${event.detail.value}" was sent`)
    setTurns((before) => [...before, { said: event.detail.value, when: new Date().toISOString() }])
  }

  const pinned = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-pin', `pinning is about to change to ${event.detail.value}`)
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
        <helix-chat-composer
          placeholder="Write a message"
          slot="composer"
        />
      </helix-chat>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="description">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
