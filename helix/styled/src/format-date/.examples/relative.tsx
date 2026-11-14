import { useEffect, useState } from 'react'

const HOUR = 3_600_000

export function Example() {
  /* Set after mount, so the server and the client render the same markup,
     and the readings always say three hours ago and in two days. */
  const [now, setNow] = useState<number>()

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const ago = now === undefined ? '' : new Date(now - 3 * HOUR).toISOString()
  const due = now === undefined ? '' : new Date(now + 48 * HOUR).toISOString()

  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-text>
        Long:{' '}
        <helix-format-date
          date={ago}
          relative="long"
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Short:{' '}
        <helix-format-date
          date={ago}
          relative="short"
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Narrow:{' '}
        <helix-format-date
          date={ago}
          relative="narrow"
        ></helix-format-date>
      </helix-text>

      <helix-text>
        Due:{' '}
        <helix-format-date
          date={due}
          numeric="always"
          relative="long"
        ></helix-format-date>
      </helix-text>
    </helix-flex>
  )
}
