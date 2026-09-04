import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose a time', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing "${event.detail.value}", refusable`)
  }

  const moved = (event: Event & { currentTarget: HelixTimePicker }) => {
    say('input', `"${event.currentTarget.value}" as it is chosen`)
  }

  const settled = (event: Event & { currentTarget: HelixTimePicker }) => {
    say('change', `"${event.currentTarget.value}", the reader is done`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-time-picker
        default-value="09:30"
        onChange={settled}
        onhelix-before-change={proposed}
        onInput={moved}
      />

      <helix-list
        divided
        label="What arrived"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
