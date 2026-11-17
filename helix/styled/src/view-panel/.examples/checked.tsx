import type { HelixViewPanel } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import './checked.css'

const rows = [
  { customer: 'Acme Corporation', due: '2026-10-12', id: 'INV-2041', status: 'Overdue' },
  { customer: 'Acme Logistics', due: '2026-10-18', id: 'INV-2047', status: 'Paid' },
  { customer: 'Acme Robotics', due: '2026-10-21', id: 'INV-2052', status: 'Overdue' },
]

export function Example() {
  const panel = useRef<HelixViewPanel>(null)

  useEffect(() => {
    const sheet = panel.current
    sheet?.updateComplete.then(() => sheet.openSection('sort'))
  }, [])

  return (
    <>
      <div className="view-sheet">
        <helix-view-panel
          for="sorted-invoices"
          ref={panel}
        ></helix-view-panel>
      </div>
      <helix-data-table
        default-view={JSON.stringify({ sort: 'due:asc' })}
        id="sorted-invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
      >
        <helix-table-column
          field="customer"
          row-header
          sortable
        >
          Customer
        </helix-table-column>
        <helix-table-column
          field="due"
          sortable
        >
          Due
        </helix-table-column>
        <helix-table-column
          field="status"
          type="enum"
        >
          Status
        </helix-table-column>
      </helix-data-table>
    </>
  )
}
