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
    <helix-notifications id="feed" label="Notifications" mark-all>
      {' '}
      <h2 slot="header">Notifications</h2>{' '}
      <helix-notification at={at[0]} dismissible>
        {' '}
        <strong>Ada Okonjo</strong> approved your deploy to production.{' '}
        <helix-button emphasis="ghost" slot="actions">
          View
        </helix-button>{' '}
      </helix-notification>{' '}
      <helix-notification at={at[1]} dismissible>
        {' '}
        Build <strong>#4821</strong> failed on <code>main</code>{' '}
        <helix-button emphasis="ghost" slot="actions">
          Logs
        </helix-button>{' '}
      </helix-notification>{' '}
      <helix-notification at={at[2]} default-read dismissible>
        {' '}
        Your invitation to <strong>Fusion Design</strong> was accepted.{' '}
      </helix-notification>{' '}
      <a data-link href="#all" slot="footer">
        See everything
      </a>{' '}
    </helix-notifications>
  )
}
