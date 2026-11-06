import './preview.css'

const rows = [
  { customer: 'Acme Corporation', due: '2026-10-12', id: 'INV-2041', status: 'Overdue' },
  { customer: 'Acme Logistics', due: '2026-10-18', id: 'INV-2047', status: 'Paid' },
  { customer: 'Acme Robotics', due: '2026-10-21', id: 'INV-2052', status: 'Overdue' },
]

const overdue = JSON.stringify({
  filters: [{ field: 'status', operator: 'any', values: ['Overdue'] }],
})

export function Example() {
  return (
    <>
      <div className="view-sheet">
        <helix-headless-view-panel for="invoices">
          <helix-headless-quick-filters
            for="invoices"
            slot="presets"
          >
            <helix-headless-quick-filter view={JSON.stringify({ filters: [] })}>
              All
            </helix-headless-quick-filter>
            <helix-headless-quick-filter view={overdue}>Overdue</helix-headless-quick-filter>
          </helix-headless-quick-filters>
          <helix-headless-column-manager
            for="invoices"
            slot="columns"
          ></helix-headless-column-manager>
          <helix-headless-table-export
            for="invoices"
            slot="export"
          ></helix-headless-table-export>
        </helix-headless-view-panel>
      </div>
      <helix-headless-data-table
        default-view={JSON.stringify({ sort: 'due:asc' })}
        id="invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
      >
        <helix-headless-table-column
          field="customer"
          row-header
          sortable
        >
          Customer
        </helix-headless-table-column>
        <helix-headless-table-column
          field="due"
          sortable
        >
          Due
        </helix-headless-table-column>
        <helix-headless-table-column
          field="status"
          type="enum"
        >
          Status
        </helix-headless-table-column>
      </helix-headless-data-table>
    </>
  )
}
