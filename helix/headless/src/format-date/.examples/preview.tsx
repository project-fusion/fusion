import { useEffect, useState } from 'react'
import './preview.css'

const AGO = 42 * 60_000

/* The dates are fixed and name a `time-zone`, so they look the same wherever
   the preview renders. */
const FIXED = '2026-03-14T15:09:00.000Z'

export function Example() {
  const [at, setAt] = useState('')

  useEffect(() => {
    setAt(new Date(Date.now() - AGO).toISOString())
  }, [])

  return (
    <dl>
      <dt>Elapsed:</dt>
      <dd>
        <helix-headless-format-date
          date={at}
          elapsed
        ></helix-headless-format-date>
      </dd>

      <dt>Date:</dt>
      <dd>
        <helix-headless-format-date
          date={FIXED}
          day="numeric"
          month="short"
          time-zone="UTC"
          year="numeric"
        ></helix-headless-format-date>
      </dd>

      <dt>Time:</dt>
      <dd>
        <helix-headless-format-date
          date={FIXED}
          hour="numeric"
          minute="2-digit"
          time-zone="UTC"
        ></helix-headless-format-date>
      </dd>

      <dt>Weekday:</dt>
      <dd>
        <helix-headless-format-date
          date={FIXED}
          day="numeric"
          month="long"
          time-zone="UTC"
          weekday="long"
        ></helix-headless-format-date>
      </dd>
    </dl>
  )
}
