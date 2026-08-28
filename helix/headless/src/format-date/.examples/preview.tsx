import { useEffect, useState } from 'react'
import './preview.css'

const AGO = 42 * 60_000

/* Pinned for the reason the styled twin records: only `elapsed` can be computed
   without the picture moving, because it is always the same distance from now. */
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
        <helix-headless-format-date date={at} elapsed></helix-headless-format-date>
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
