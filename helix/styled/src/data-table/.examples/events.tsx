import type { HelixDataTable } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 7

const RESTING: Arrival[] = [{ carried: 'Sort a column, search, or page', name: 'Nothing yet' }]

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

  /* `search` rather than writing `filter`, because it goes through the request
     the component makes for itself, which is the one that announces. */
  const searched = (event: CustomEvent<{ value: string }>) => {
    objects.current?.search(event.detail.value)
  }

  const sorted = (event: CustomEvent<{ value: string }>) => {
    say('helix-sort', `${event.detail.value}, which reorders and changes nothing`)
  }

  const filtered = (event: CustomEvent<{ value: string }>) => {
    say('helix-filter', `the query is "${event.detail.value}"`)
  }

  const paged = (event: CustomEvent<{ value: string }>) => {
    say('helix-navigate', `page ${event.detail.value}, which is a move`)
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
