import { useState } from 'react'

type Arrival = { carried: string; name: string }

const KEEP = 5

const RESTING: Arrival[] = [{ carried: 'Type into the field', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const [value, setValue] = useState('')

  /* Refuse the change, then write the value. Writing `value` alone does not
     take control, because the element keeps applying what you type. */
  const changing = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    const next = event.detail.value.toUpperCase()
    setValue(next)
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [
        ...kept,
        {
          carried: `Refused "${event.detail.value}", wrote "${next}"`,
          name: 'helix-before-change',
        },
      ].slice(-KEEP)
    })
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* The page changes the text to uppercase as you type. */}
      <helix-filter-input
        hint="Text is changed to uppercase as you type"
        label="Filter rows"
        onhelix-before-change={changing}
        value={value}
      ></helix-filter-input>

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
