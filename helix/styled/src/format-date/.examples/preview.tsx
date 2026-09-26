import { useEffect, useState } from 'react'

const AGO = 42 * 60_000

/* The dates are fixed and name a `time-zone`, so they look the same wherever
   the preview renders. */
const FIXED = '2026-03-14T15:09:00.000Z'

export function Example() {
  /* The elapsed time is set after mount, so the server and the client render
     the same markup. */
  const [at, setAt] = useState('')

  useEffect(() => {
    setAt(new Date(Date.now() - AGO).toISOString())
  }, [])

  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-text>
        Elapsed:{' '}
        <helix-format-date
          date={at}
          elapsed
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Date:{' '}
        <helix-format-date
          date={FIXED}
          day="numeric"
          month="short"
          time-zone="UTC"
          year="numeric"
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Time:{' '}
        <helix-format-date
          date={FIXED}
          hour="numeric"
          minute="2-digit"
          time-zone="UTC"
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Weekday:{' '}
        <helix-format-date
          date={FIXED}
          day="numeric"
          month="long"
          time-zone="UTC"
          weekday="long"
        ></helix-format-date>
      </helix-text>
    </helix-flex>
  )
}
