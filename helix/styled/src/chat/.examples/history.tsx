import { useState } from 'react'

type Turn = [author: 'me' | 'them', text: string]

const CURRENT: Turn[] = [
  ['them', 'Deploy 4127 is rolling back. Error rate on checkout crossed 2% at 14:02.'],
  ['me', 'Is it the new payment client?'],
  ['them', 'Looks like it. The retries are hitting the old endpoint.'],
  ['me', 'Pinning the client to 3.8 and redeploying.'],
  ['them', 'Rollback finished. Error rate is back under 0.1%.'],
  ['me', 'Leaving the incident open until the fix lands.'],
  ['them', 'Opened PAY-2231 for the retry path.'],
  ['me', 'Thanks. I will post a summary in the morning.'],
]

/* Each load returns older messages. The last load reaches the start. */
const LOADS: Turn[][] = [
  [
    ['them', 'Checkout alarms paged at 13:58.'],
    ['me', 'Acknowledged. Looking at the dashboards.'],
    ['them', 'p99 on payments doubled in ten minutes.'],
    ['me', 'Opening the incident channel.'],
  ],
  [
    ['them', 'Deploy 4127 went out at 13:51 with the new payment client.'],
    ['me', 'Anything in the canary?'],
    ['them', 'Canary was green. The retry path only runs under load.'],
    ['me', 'Keep an eye on it.'],
  ],
  [
    ['them', 'Payments is on the release train for 13:50.'],
    ['me', 'Noted. I am on call this afternoon.'],
  ],
]

export function Example() {
  const [loaded, setLoaded] = useState(0)
  const [history, setHistory] = useState<'' | 'loading' | 'more'>('more')

  const load = () => {
    setHistory('loading')
    /* A timer stands in for a network request. */
    setTimeout(() => {
      setLoaded(loaded + 1)
      setHistory(loaded + 1 < LOADS.length ? 'more' : '')
    }, 600)
  }

  const turns = [...LOADS.slice(0, loaded).reverse().flat(), ...CURRENT]

  return (
    <helix-chat
      className="history"
      history={history}
      label="Incident channel"
      onhelix-history={load}
    >
      <strong slot="header">#incident-2231</strong>
      {turns.map(([author, text]) => (
        <helix-chat-message
          author={author}
          key={text}
          state="sent"
        >
          {text}
        </helix-chat-message>
      ))}
    </helix-chat>
  )
}
