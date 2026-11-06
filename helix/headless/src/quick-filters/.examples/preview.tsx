import './preview.css'

const rows = [
  { amount: 12400, customer: 'Acme Corporation', id: 'INV-2041', status: 'Overdue' },
  { amount: 8250, customer: 'Acme Logistics', id: 'INV-2047', status: 'Paid' },
  { amount: 6980, customer: 'Acme Robotics', id: 'INV-2052', status: 'Overdue' },
  { amount: 15120, customer: 'Acme Foods', id: 'INV-2063', status: 'Paid' },
]

const status = (value: string) =>
  JSON.stringify({ filters: [{ field: 'status', operator: 'any', values: [value] }] })

export function Example() {
  return (
    <>
      <helix-headless-quick-filters
        for="invoices"
        label="Invoice views"
      >
        <helix-headless-quick-filter view={JSON.stringify({ filters: [] })}>
          All
        </helix-headless-quick-filter>
        <helix-headless-quick-filter view={status('Overdue')}>Overdue</helix-headless-quick-filter>
        <helix-headless-quick-filter view={status('Paid')}>Paid</helix-headless-quick-filter>
      </helix-headless-quick-filters>
      <helix-headless-data-table
        id="invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
      >
        <helix-headless-table-column
          field="id"
          row-header
        >
          Invoice
        </helix-headless-table-column>
        <helix-headless-table-column field="customer">Customer</helix-headless-table-column>
        <helix-headless-table-column
          field="status"
          type="enum"
        >
          Status
        </helix-headless-table-column>
        <helix-headless-table-column
          field="amount"
          text-align="end"
          type="number"
        >
          Amount
        </helix-headless-table-column>
      </helix-headless-data-table>
    </>
  )
}
