import { type ReactNode, useEffect, useState } from 'react'
import './controlled.css'

/** Stands in for a request to your server. */
const acknowledge = async (): Promise<boolean> => Promise.resolve(true)

/**
 * `read` is a boolean attribute, so markup cannot set it to false. To control
 * read state, cancel `helix-read`, save the change on your server, and then set
 * `read`.
 */
function Owned({ at, children }: { at: string | undefined; children: ReactNode }) {
  const [read, setRead] = useState(false)

  return (
    <helix-notification
      at={at}
      onClick={(event) => event.currentTarget.markRead(true)}
      onhelix-read={async (event) => {
        event.preventDefault()
        const asked = event.detail.read
        if (await acknowledge()) {
          setRead(asked)
        }
      }}
      read={read}
    >
      {children}
    </helix-notification>
  )
}

export function Example() {
  const [at, setAt] = useState<string>()

  useEffect(() => {
    setAt(new Date(Date.now() - 9 * 60000).toISOString())
  }, [])

  return (
    <helix-notifications
      className="feed"
      label="Activity"
      mark-all
    >
      <Owned at={at}>
        <strong>Invoice #1042</strong> was paid.
      </Owned>

      <Owned at={at}>
        <strong>Quarterly report</strong> is ready to download.
      </Owned>
    </helix-notifications>
  )
}
