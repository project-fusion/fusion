import { useEffect, useState } from 'react'

const AGO = 42 * 60_000

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
        <helix-format-date date={at} day="numeric" month="short" year="numeric"></helix-format-date>
      </helix-text>

      <helix-text>
        Time: <helix-format-date date={at} hour="numeric" minute="2-digit"></helix-format-date>
      </helix-text>

      <helix-text>
        Weekday:{' '}
        <helix-format-date date={at} day="numeric" month="long" weekday="long"></helix-format-date>
      </helix-text>
    </helix-flex>
  )
}
