import { type ReactNode, useEffect, useState } from 'react'
import './read-on-the-server.css'

/** Stands in for the round trip a real page would make. */
const acknowledge = async (): Promise<boolean> => Promise.resolve(true)

/**
 * One item whose read state the page owns.
 *
 * **Refusing the event is how a page owns the state.** `read` is a boolean
 * attribute, so its presence means true and there is no way to write "the page
 * owns this and it is currently false" as markup: `read="false"` is a present
 * attribute and therefore true.
 *
 * So the page refuses instead. `preventDefault` stops the item applying
 * anything, the request goes to the server, and the property is written only
 * once the server agreed. A failed request leaves the item unread rather than
 * lying about it, which is the whole reason read state is reported here and not
 * invented.
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
        <strong>cortex-core</strong> finished indexing.
      </Owned>

      <Owned at={at}>
        A new version of <strong>@fusion.dev/helix</strong> is available.
      </Owned>
    </helix-notifications>
  )
}
