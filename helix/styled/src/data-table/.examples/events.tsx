import type { HelixDataTable } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last seven events.
const KEEP = 7

const RESTING: Arrival[] = [
  { carried: 'Sort a column, search, or change the page', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const objects = useRef<HelixDataTable>(null)

  const ROWS = [
    { name: 'avatar.png', size: '18 KB' },
    { name: 'index.html', size: '2 KB' },
    { name: 'report.pdf', size: '1.2 MB' },
    { name: 'styles.css', size: '44 KB' },
  ]

  /* `search` sends the same request the table makes for itself, so the table
     announces the result. */
  const searched = (event: CustomEvent<{ value: string }>) => {
    objects.current?.search(event.detail.value)
  }

  const sorted = (event: CustomEvent<{ value: string }>) => {
    say('helix-sort', `Sorted by ${event.detail.value}`)
  }

  const filtered = (event: CustomEvent<{ value: string }>) => {
    say('helix-filter', `Filter text is "${event.detail.value}"`)
  }

  const paged = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `Moved to page ${event.detail.value}`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-data-table
        label="Objects"
        onhelix-filter={filtered}
        onhelix-navigate={paged}
        onhelix-sort={sorted}
        page-size="3"
        ref={objects}
        rows={ROWS}
      >
        <helix-input
          onhelix-before-change={searched}
          placeholder="Search"
          slot="toolbar"
        />
        <helix-table-column
          field="name"
          sortable
        >
          Name
        </helix-table-column>
        <helix-table-column
          field="size"
          sortable
        >
          Size
        </helix-table-column>
      </helix-data-table>

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
