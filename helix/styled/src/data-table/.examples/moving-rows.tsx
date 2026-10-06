import { useState } from 'react'

const JOBS = [
  { id: 'invoice', name: 'Invoice 1042', pages: 2 },
  { id: 'brochure', name: 'Spring brochure', pages: 12 },
  { id: 'contract', name: 'Lease contract', pages: 9 },
  { id: 'labels', name: 'Shipping labels', pages: 4 },
]

export function Example() {
  const [jobs, setJobs] = useState(JOBS)

  // The table moves no row itself. Set `rows` to the order the event carries.
  const reordered = (event: CustomEvent<{ keys: string[]; kind: string }>) => {
    if (event.detail.kind === 'row') {
      setJobs(event.detail.keys.flatMap((key) => JOBS.filter((job) => job.id === key)))
    }
  }

  return (
    <helix-data-table
      label="Print queue"
      onhelix-reorder={reordered}
      reorderable-rows
      row-key="id"
      rows={jobs}
    >
      <helix-table-column field="name">Document</helix-table-column>
      <helix-table-column
        field="pages"
        text-align="end"
      >
        Pages
      </helix-table-column>
    </helix-data-table>
  )
}
