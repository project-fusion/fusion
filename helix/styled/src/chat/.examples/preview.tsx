import { useEffect, useState } from 'react'

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
    <helix-chat
      label="Support"
      onhelix-send={(event) =>
        setSent((all) => [...all, { at: new Date().toISOString(), body: event.detail.value }])
      }
    >
      <strong slot="header">Support</strong>

      <helix-chat-message
        at={at[0]}
        author="them"
        author-label="Support"
        state="sent"
      >
        How can I help?
      </helix-chat-message>

      <helix-chat-message
        at={at[1]}
        author="me"
        state="sent"
      >
        The deploy is stuck on the migration step.
      </helix-chat-message>

      <helix-chat-message
        at={at[2]}
        author="them"
        author-label="Support"
        state="streaming"
      >
        I am checking the migration now
      </helix-chat-message>

      <helix-chat-message
        author="me"
        state="failed"
      >
        Thanks
      </helix-chat-message>

      {sent.map((turn) => (
        <helix-chat-message
          at={turn.at}
          author="me"
          key={turn.at}
          state="sent"
        >
          {turn.body}
        </helix-chat-message>
      ))}

      <span slot="status">Support is typing</span>

      <helix-chat-composer
        placeholder="Write a message"
        slot="composer"
      />
    </helix-chat>
  )
}
