import { useEffect, useState } from 'react'
import './preview.css'

const AGO = 42 * 60_000

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
          date={at}
          day="numeric"
          month="short"
          year="numeric"
        ></helix-headless-format-date>
      </dd>

      <dt>Time:</dt>
      <dd>
        <helix-headless-format-date
          date={at}
          hour="numeric"
          minute="2-digit"
        ></helix-headless-format-date>
      </dd>

      <dt>Weekday:</dt>
      <dd>
        <helix-headless-format-date
          date={at}
          day="numeric"
          month="long"
          weekday="long"
        ></helix-headless-format-date>
      </dd>
    </dl>
  )
}
