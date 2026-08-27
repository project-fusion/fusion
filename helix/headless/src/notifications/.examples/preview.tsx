import { useEffect, useState } from 'react'

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60000).toISOString()

const AGES = [3, 42, 1500]

export function Example() {
  /* After mount rather than during render, which is what the HTML example does
   from a script and is the only correct answer here. A timestamp written as a
   literal reads "8 months ago" by the time anybody looks at it, and one
   computed during render disagrees between the server and the client, which is
   a hydration mismatch on every load. */
  const [at, setAt] = useState<string[]>([])

  useEffect(() => {
    setAt(AGES.map(ago))
  }, [])

  return (
    <helix-headless-notifications label="Notifications" mark-all>
      <h2 slot="header">Notifications</h2>

      <helix-headless-notification at={at[0]} dismissible>
        Ada Okonjo approved your deploy to production.
        <span slot="caption">fusion-io/helix &middot; main</span>
        <button slot="actions" type="button">
          View
        </button>
      </helix-headless-notification>

      <helix-headless-notification at={at[1]} dismissible>
        Build #4821 failed on main
        <span slot="caption">3 of 118 checks did not pass</span>
        <button slot="actions" type="button">
          Logs
        </button>
      </helix-headless-notification>

      <helix-headless-notification at={at[2]} default-read dismissible>
        Your invitation to Fusion Design was accepted.
      </helix-headless-notification>

      <a href="#all" slot="footer">
        See everything
      </a>
    </helix-headless-notifications>
  )
}
