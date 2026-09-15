import './preview.css'
import { useEffect, useState } from 'react'

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString()

const AGES = [3, 42, 1500]

export function Example() {
  /* Set after mount rather than written into the markup, because a timestamp in
     an example is stale the moment it is committed, and one computed during
     render disagrees between the server and the client. */
  const [at, setAt] = useState<string[]>([])

  useEffect(() => {
    setAt(AGES.map(ago))
  }, [])

  return (
    <helix-headless-notifications
      id="raw"
      label="Notifications"
      mark-all
    >
      <h2 slot="header">Notifications</h2>
      <helix-headless-notification
        at={at[0]}
        dismissible
      >
        <helix-headless-avatar
          name="Ada Okonjo"
          slot="media"
        ></helix-headless-avatar>
        <strong>Ada Okonjo</strong> approved your deploy to production.
        <button
          slot="actions"
          type="button"
        >
          View
        </button>
      </helix-headless-notification>
      <helix-headless-notification
        at={at[1]}
        dismissible
      >
        <helix-headless-icon
          name="warning"
          slot="media"
        ></helix-headless-icon>
        Build <strong>#4821</strong> failed on <code>main</code>
        <button
          slot="actions"
          type="button"
        >
          Logs
        </button>
      </helix-headless-notification>
      <helix-headless-notification
        at={at[2]}
        default-read
        dismissible
      >
        <helix-headless-avatar
          name="Platform Team"
          slot="media"
        ></helix-headless-avatar>
        Your invitation to the <strong>Platform</strong> team was accepted.
      </helix-headless-notification>
      <a
        href="#all"
        slot="footer"
      >
        See everything
      </a>
    </helix-headless-notifications>
  )
}
