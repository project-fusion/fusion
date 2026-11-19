import type { HelixToggleGroup } from '@fusion.dev/helix'
import { useState } from 'react'
import './changing.css'

type State = 'done' | 'listening' | 'thinking' | 'working'

export function Example() {
  const [state, setState] = useState<State>('thinking')

  // A new state blends from the shape on the screen, however far it has got.
  const changed = (event: Event & { currentTarget: HelixToggleGroup }) => {
    setState(event.currentTarget.value as State)
  }

  return (
    <helix-flex
      align-items="center"
      direction="column"
      gap="lg"
    >
      <helix-orb
        className="changing"
        size="lg"
        state={state}
      ></helix-orb>

      <helix-toggle-group
        label="State"
        onChange={changed}
        value={state}
      >
        <helix-toggle value="thinking">Thinking</helix-toggle>
        <helix-toggle value="working">Working</helix-toggle>
        <helix-toggle value="listening">Listening</helix-toggle>
        <helix-toggle value="done">Done</helix-toggle>
      </helix-toggle-group>
    </helix-flex>
  )
}
