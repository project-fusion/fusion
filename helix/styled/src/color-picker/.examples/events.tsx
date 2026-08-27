import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Drag the area, then try the copy and the dropper', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-change', `proposing ${event.detail.value}, refusable`)
  }

  const moved = (event: Event & { currentTarget: HelixColorPicker }) => {
    say('input', `${event.currentTarget.value} while the pointer is down`)
  }

  const settled = (event: Event & { currentTarget: HelixColorPicker }) => {
    say('change', `${event.currentTarget.value}, once it is let go`)
  }

  const copied = (event: CustomEvent<{ value: string }>) => {
    say('helix-copy', `${event.detail.value} is on the clipboard`)
  }

  const sampling = () => {
    say('helix-sample-start', 'the dropper is live, so the page is being read')
  }

  const sampled = () => {
    say('helix-sample-end', 'the dropper is done, whether or not it took one')
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-color-picker
        default-value="#3366ff"
        onChange={settled}
        onhelix-before-change={proposed}
        onhelix-copy={copied}
        onhelix-sample-end={sampled}
        onhelix-sample-start={sampling}
        onInput={moved}
      />

      <helix-list divided label="What arrived">
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
