import './preview.css'

const rows = [
  { amount: 12400, customer: 'Acme Corporation', id: 'INV-2041' },
  { amount: 8250, customer: 'Acme Logistics', id: 'INV-2047' },
  { amount: 6980, customer: 'Acme Robotics', id: 'INV-2052' },
]

export function Example() {
  return (
    <div className="export-pane">
      <helix-headless-table-export for="invoices"></helix-headless-table-export>
      <helix-headless-data-table
        id="invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
        selectable
      >
        <helix-headless-table-column
          field="id"
          row-header
        >
          Invoice
        </helix-headless-table-column>
        <helix-headless-table-column field="customer">Customer</helix-headless-table-column>
        <helix-headless-table-column
          field="amount"
          text-align="end"
          type="number"
        >
          Amount
        </helix-headless-table-column>
      </helix-headless-data-table>
    </div>
  )
}
