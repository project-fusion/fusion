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
 *
 * **The rest write on upgrade, or are written to as React writes before one.**
 * A Kbd writes onto the control it names, a feed counts its items, and a listbox
 * highlights an option, each of which React reports if it lands before React
 * hydrates. The splitter takes a camelCase prop, which arrives as a lowered
 * attribute on an element not defined yet.
 */
export const POINTS = [
  { lat: 30.2862, lng: -97.7394 },
  { lat: 30.2669, lng: -97.7713 },
]

/** What the data families hold in a property alone, which a server's markup cannot carry. */
export const RESPONSE = { id: 'dpl_8f2c', regions: ['iad1', 'sfo1'], state: 'READY' }

export const PEOPLE = [
  { id: 'p1', name: 'Ada' },
  { id: 'p2', name: 'Grace' },
  { id: 'p3', name: 'Lin' },
]

const ROW = '<div><span data-field="name"></span></div>'

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
      <input aria-label="Search" id="search" />
      <helix-kbd for="search" keys="mod+k"></helix-kbd>
      <helix-notifications id="feed" label="Activity">
        <helix-notification>One</helix-notification>
      </helix-notifications>
      <helix-listbox default-value="b" label="Letters">
        <helix-option value="a">A</helix-option>
        <helix-option value="b">B</helix-option>
      </helix-listbox>
      <helix-splitter defaultPosition={16} id="splitter" label="Panes">
        <div slot="start">Start</div>
        <div slot="end">End</div>
      </helix-splitter>
      <helix-object-inspector
        default-depth="2"
        id="inspector"
        label="Response"
        value={RESPONSE}
      ></helix-object-inspector>
      <helix-virtual-list
        id="people"
        items={PEOPLE}
        key-field="id"
        label="People"
        selection-mode="multiple"
        value="p2"
      >
        <template dangerouslySetInnerHTML={{ __html: ROW }} slot="row"></template>
      </helix-virtual-list>
      <button id="commit" onClick={() => setCommits(commits + 1)} type="button">
        Commits: {commits}
      </button>
    </main>
  )
}
