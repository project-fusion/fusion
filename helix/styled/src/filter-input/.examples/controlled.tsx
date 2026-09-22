import { useState } from 'react'

type Arrival = { carried: string; name: string }

const KEEP = 5

const RESTING: Arrival[] = [{ carried: 'Type into the field', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const [value, setValue] = useState('')

  /* **This is the whole of it: refuse, then write.**
     Writing `value` on its own would not have taken ownership. The property
     applies whatever it is given and goes on applying whatever the reader
     types, so a page that only wrote it would be corrected on the next
     keystroke. Refusing is what stops the element applying the edit, and leaves
     the page to say what the value is. */
  const changing = (event: CustomEvent<{ value: string }>) => {
    event.preventDefault()
    const next = event.detail.value.toUpperCase()
    setValue(next)
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [
        ...kept,
        {
          carried: `refused "${event.detail.value}", wrote "${next}"`,
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
      {/* **Uppercased as it is typed**, which is the smallest thing that shows
          who won: if the element still owned the text, the reader's own case
          would survive a keystroke. */}
      <helix-filter-input
        hint="Typed text arrives here in upper case, because the page decided so"
        label="Filter rows"
        onhelix-before-change={changing}
        value={value}
      ></helix-filter-input>

      <helix-list
        divided
        label="What arrived"
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
