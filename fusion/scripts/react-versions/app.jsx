import { useState } from 'react'

/**
 * The page every React version renders on the server and hydrates in Chromium.
 *
 * **Two elements given the same props, one of them Helix's.** `helix-button`
 * and `helix-map-route` are what a consumer imports, and the bridge repairs
 * them. `probe-element` is a plain custom element with nothing of the bridge
 * in it, so what it receives is what React itself delivers: a handler that
 * reaches it and an array that arrives say the version no longer needs the
 * bridge.
 *
 * Each handler is a new function on every render, as an inline arrow is in a
 * consumer's JSX, so a commit hands React a different handler to swap in.
 */
export const POINTS = [
  { lat: 30.2862, lng: -97.7394 },
  { lat: 30.2669, lng: -97.7713 },
]

export function App() {
  const [commits, setCommits] = useState(0)
  const count = (name) => () => {
    globalThis.calls[name] += 1
  }
  return (
    <main>
      <helix-button id="helix" onhelix-press={count('helix')}>
        Press
      </helix-button>
      <helix-map-route id="route" label="Route" points={POINTS}></helix-map-route>
      <probe-element id="probe" onhelix-press={count('probe')} points={POINTS}></probe-element>
      <button id="commit" onClick={() => setCommits(commits + 1)} type="button">
        Commits: {commits}
      </button>
    </main>
  )
}
