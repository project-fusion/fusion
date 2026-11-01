import { useEffect, useState } from 'react'
import './preview.css'

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString()

const AGES = [3, 42, 1500]

export function Example() {
  /* The timestamps are set after mount, relative to now, so the server and the
     client render the same markup. */
  const [at, setAt] = useState<string[]>([])

  useEffect(() => {
    setAt(AGES.map(ago))
  }, [])

  return (
    <helix-notifications
      className="feed"
      id="feed"
      label="Notifications"
      mark-all
    >
      <helix-text
        as="h2"
        scale="title"
        slot="header"
      >
        Notifications
      </helix-text>
      <helix-notification
        at={at[0]}
        dismissible
      >
        <helix-avatar
          name="Ada Okonjo"
          slot="media"
        ></helix-avatar>
        <strong>Ada Okonjo</strong> approved your deploy to production.
        <helix-button
          emphasis="subtle"
          slot="actions"
        >
          View
        </helix-button>
      </helix-notification>
      <helix-notification
        at={at[1]}
        dismissible
      >
        <helix-icon
          name="warning"
          slot="media"
        ></helix-icon>
        Build <strong>#4821</strong> failed on <helix-code>main</helix-code>
        <helix-button
          emphasis="subtle"
          slot="actions"
        >
          Logs
        </helix-button>
      </helix-notification>
      <helix-notification
        at={at[2]}
        default-read
        dismissible
      >
        <helix-avatar
          name="Platform Team"
          slot="media"
        ></helix-avatar>
        Your invitation to the <strong>Platform</strong> team was accepted.
      </helix-notification>
      <a
        data-button="subtle"
        href="#all"
        slot="footer"
      >
        See everything
      </a>
    </helix-notifications>
  )
}
