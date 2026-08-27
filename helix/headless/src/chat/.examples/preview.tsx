import { useEffect, useState } from 'react'

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString()

interface Turn {
  at: string
  body: string
}

export function Example() {
  /* Set after mount rather than written into the markup, because a timestamp in
     an example is stale the moment it is committed, and one computed during
     render disagrees between the server and the client. */
  const [at, setAt] = useState<string[]>([])

  /* The transcript reports and the page decides, which is the whole contract:
     nothing here is a client. In React that is a list in state rather than an
     element built and appended by hand. */
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

      <helix-headless-chat-message at={at[0]} author="them" state="sent">
        How can I help?
      </helix-headless-chat-message>

      <helix-headless-chat-message at={at[1]} author="me" state="sent">
        The deploy is stuck on the migration step.
      </helix-headless-chat-message>

      <helix-headless-chat-message at={at[2]} author="them" state="streaming">
        Let me look at the run now
      </helix-headless-chat-message>

      <helix-headless-chat-message author="me" state="failed">
        Thanks
      </helix-headless-chat-message>

      {sent.map((turn) => (
        <helix-headless-chat-message at={turn.at} author="me" key={turn.at} state="sent">
          {turn.body}
        </helix-headless-chat-message>
      ))}

      <span slot="status">Support is typing</span>

      <helix-headless-chat-composer placeholder="Write a message" slot="composer" />
    </helix-headless-chat>
  )
}
