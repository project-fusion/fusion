import { useEffect, useState } from 'react'
import './preview.css'

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString()

interface Turn {
  at: string
  body: string
}

export function Example() {
  /* The timestamps are set after mount, so they are always a few minutes old
     and the server and the client render the same markup. */
  const [at, setAt] = useState<string[]>([])

  /* Each message you send is added to this list and rendered at the end of the
     transcript. */
  const [sent, setSent] = useState<Turn[]>([])

  useEffect(() => {
    setAt([6, 4, 1].map(ago))
  }, [])

  return (
    <helix-headless-chat
      label="Support"
      onhelix-send={(event) =>
        setSent((all) => [...all, { at: new Date().toISOString(), body: event.detail.value }])
      }
    >
      <strong slot="header">Support</strong>

      <helix-headless-chat-message
        at={at[0]}
        author="them"
        state="sent"
      >
        How can I help?
      </helix-headless-chat-message>

      <helix-headless-chat-message
        at={at[1]}
        author="me"
        state="sent"
      >
        The deploy is stuck on the migration step.
      </helix-headless-chat-message>

      <helix-headless-chat-message
        at={at[2]}
        author="them"
        state="streaming"
      >
        I am checking the migration now
      </helix-headless-chat-message>

      <helix-headless-chat-message
        author="me"
        state="failed"
      >
        Thanks
      </helix-headless-chat-message>

      {sent.map((turn) => (
        <helix-headless-chat-message
          at={turn.at}
          author="me"
          key={turn.at}
          state="sent"
        >
          {turn.body}
        </helix-headless-chat-message>
      ))}

      <span slot="status">Support is typing</span>

      <helix-headless-chat-composer
        placeholder="Write a message"
        slot="composer"
      />
    </helix-headless-chat>
  )
}
