import { useState } from 'react'

const TOTAL = 40

/* Forty rows, generated rather than written out: what the example is about is
   the footer, and thirty-two more lines of plausible file names would bury it. */
const rows = Array.from({ length: TOTAL }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(3, '0')}.webp`,
  size: 12_000 + index * 837,
}))

export function Example() {
  /* The summary takes its own `page`, `page-size` and `total` rather than
     reading them off the table, which the component says of itself: three
     numbers from the consumer's query, used twice. Here that query is this
     state, so the two cannot skew. */
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  const paged = (event: CustomEvent<{ value: string }>) => {
    setPage(Number(event.detail.value))
  }

  const resized = (event: CustomEvent<{ value: string }>) => {
    setPageSize(Number(event.detail.value))
    setPage(1)
  }

  return (
    <helix-data-table
      label="Files"
      onhelix-navigate={paged}
      page={page}
      page-size={pageSize}
      rows={rows}
    >
      <helix-pagination-summary
        page={page}
        page-size={pageSize}
        slot="footer"
        total={TOTAL}
      ></helix-pagination-summary>
      <helix-pagination-size
        onhelix-before-change={resized}
        sizes="8,16,40"
        slot="footer"
        value={pageSize}
      ></helix-pagination-size>

      <helix-table-column
        field="name"
        sortable
        width="14rem"
      >
        File
      </helix-table-column>
      <helix-table-column
        align="end"
        field="size"
        sortable
      >
        Size
      </helix-table-column>
      <helix-table-column field="kind">Kind</helix-table-column>
    </helix-data-table>
  )
}
