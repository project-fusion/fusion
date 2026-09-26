import { useState } from 'react'

/* The notifications are data, so the badge can count the unread ones. */
const ARRIVED = [
  { id: 'deploy', minutes: 3, read: false },
  { id: 'build', minutes: 42, read: false },
  { id: 'invite', minutes: 1500, read: true },
]

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

export function Example() {
  const [items, setItems] = useState(ARRIVED)

  /* Your page owns the unread count. It updates the badge when the feed reports
     a change. */
  const unread = items.filter((one) => !one.read).length

  const readAt = (id: string) => (event: CustomEvent<{ read: boolean }>) => {
    const next = event.detail.read
    setItems((before) => before.map((one) => (one.id === id ? { ...one, read: next } : one)))
  }

  const dismissed = (id: string) => () => {
    setItems((before) => before.filter((one) => one.id !== id))
  }

  const body: Record<string, React.ReactNode> = {
    build: (
      <>
        Build <strong>#4821</strong> failed on <code>main</code>
        <helix-button
          emphasis="ghost"
          slot="actions"
        >
          Logs
        </helix-button>
      </>
    ),
    deploy: (
      <>
        <strong>Ada Okonjo</strong> approved your deploy to production.
        <helix-button
          emphasis="ghost"
          slot="actions"
        >
          View
        </helix-button>
      </>
    ),
    invite: (
      <>
        Your invitation to the <strong>Platform</strong> team was accepted.
      </>
    ),
  }

  return (
    <>
      <helix-badge
        label={`${unread} unread`}
        value={String(unread)}
      >
        <helix-icon-button
          command="--show"
          commandfor="panel"
          label="Notifications"
        >
          <helix-icon name="bell"></helix-icon>
        </helix-icon-button>
      </helix-badge>

      <helix-drawer
        id="panel"
        label="Notifications"
        placement="end"
      >
        <span slot="header">Notifications</span>

        <helix-notifications
          label="Notifications"
          mark-all
        >
          {items.map((one) => (
            <helix-notification
              at={ago(one.minutes)}
              dismissible
              key={one.id}
              onhelix-dismiss={dismissed(one.id)}
              onhelix-read={readAt(one.id)}
              read={one.read}
            >
              {body[one.id]}
            </helix-notification>
          ))}
        </helix-notifications>
      </helix-drawer>
    </>
  )
}
