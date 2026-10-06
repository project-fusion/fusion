import { useState } from 'react'

const DOCUMENTS = [
  { name: 'Annual report', pages: 48, value: 'report' },
  { name: 'Spring brochure', pages: 12, value: 'brochure' },
  { name: 'Lease contract', pages: 6, value: 'contract' },
]

export function Example() {
  const [documents, setDocuments] = useState(DOCUMENTS)

  // The table moves no row itself. Render the rows in the order the event carries.
  const reordered = (event: CustomEvent<{ keys: string[] }>) => {
    setDocuments(event.detail.keys.flatMap((key) => DOCUMENTS.filter((one) => one.value === key)))
  }

  return (
    <helix-table
      onhelix-reorder={reordered}
      reorderable
    >
      <h3 slot="heading">Print queue</h3>
      <helix-table-column width="14rem">Document</helix-table-column>
      <helix-table-column>Pages</helix-table-column>

      {documents.map((document) => (
        <helix-table-row
          key={document.value}
          value={document.value}
        >
          <helix-table-cell header>{document.name}</helix-table-cell>
          <helix-table-cell>{document.pages}</helix-table-cell>
        </helix-table-row>
      ))}
    </helix-table>
  )
}
