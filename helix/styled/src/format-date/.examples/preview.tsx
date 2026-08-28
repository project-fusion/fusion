import { useEffect, useState } from 'react'

const AGO = 42 * 60_000

/* **Pinned, because a picture of a clock is stale as soon as it is taken.**
   `Time:` re-rendered every minute, so its baseline drifted within minutes of
   the retake that produced it: 182 and 192 pixels on this tier, 42 and 45 on
   the headless one. Only `elapsed` stays computed, and it is stable for the
   opposite reason, being always the same distance from now. `timeZone` is
   stated so the reading does not depend on where it is rendered. */
const FIXED = '2026-03-14T15:09:00.000Z'

export function Example() {
  /* After mount rather than during render, for the reason the HTML example
   gives from its script: a timestamp written as a literal reads "Mar 2026" by
   the time anybody looks at it, and one computed during render disagrees
   between the server and the client, which is a hydration mismatch on every
   load. */
  const [at, setAt] = useState('')

  useEffect(() => {
    setAt(new Date(Date.now() - AGO).toISOString())
  }, [])

  return (
    <helix-flex direction="column" gap="sm">
      <helix-text>
        Elapsed: <helix-format-date date={at} elapsed></helix-format-date>
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
