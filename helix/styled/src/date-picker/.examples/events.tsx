import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Page the month, then choose a day', name: 'Nothing yet' }]

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

  const moved = (event: Event & { currentTarget: HelixDatePicker }) => {
    say('input', `"${event.currentTarget.value}", once and not once per element`)
  }

  const settled = (event: Event & { currentTarget: HelixDatePicker }) => {
    say('change', `"${event.currentTarget.value}", the choice is made`)
  }

  const paged = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `the view moved to ${event.detail.value}, and nothing was chosen`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-date-picker
        default-month="2026-08"
        label="Ship date"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-navigate={paged}
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
