import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last seven events.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Type in the source, then drag either divider', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const edited = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-edit', `Source is ${event.detail.value.length} characters`)
  }

  const caret = (event: CustomEvent<{ column: number; line: number }>) => {
    say('helix-caret', `line ${event.detail.line}, column ${event.detail.column}`)
  }

  const dragged = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-split', `Split at ${event.detail.value} percent`)
  }

  const panelDragged = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-panel-resize', `Panel is ${event.detail.value} pixels`)
  }

  const measured = (event: CustomEvent<{ size: number }>) => {
    say('helix-resize', `Preview is ${event.detail.size} pixels`)
  }

  const logged = (event: CustomEvent<{ level: string; text: string }>) => {
    say('helix-console', `${event.detail.level}: ${event.detail.text}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-sandbox
        onhelix-before-edit={edited}
        onhelix-before-panel-resize={panelDragged}
        onhelix-before-split={dragged}
        onhelix-caret={caret}
        onhelix-console={logged}
        onhelix-resize={measured}
      >
        <helix-sandbox-source
          name="html"
          slot="source"
          value="<p>Hello</p>"
        />
        <helix-sandbox-preview slot="preview" />
        <helix-sandbox-terminal slot="panel" />
      </helix-sandbox>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="description">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
