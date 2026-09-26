import { useState } from 'react'

const rows = Array.from({ length: 18 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(3, '0')}.webp`,
  size: 12_000 + index * 837,
}))

export function Example() {
  const [count, setCount] = useState(1)

  return (
    <>
      <helix-data-table
        default-selected="asset-002.webp"
        label="Assets"
        onhelix-select={(event: CustomEvent<{ value: string }>) =>
          setCount(event.detail.value.split(',').filter(Boolean).length)
        }
        page-size={6}
        reorderable
        row-key="name"
        rows={rows}
        selectable
      >
        <helix-table-column
          field="name"
          resizable
          sortable
          width="14rem"
        >
          File
        </helix-table-column>
        <helix-table-column
          field="size"
          resizable
          sortable
          text-align="end"
        >
          Size
        </helix-table-column>
        <helix-table-column
          field="kind"
          resizable
        >
          Kind
        </helix-table-column>
      </helix-data-table>

      <helix-text
        as="p"
        emphasis="muted"
      >
        {`${count} selected`}
      </helix-text>
    </>
  )
}
