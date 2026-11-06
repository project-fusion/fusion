const rows = [
  { amount: 12400, customer: 'Acme Corporation', id: 'INV-2041', status: 'Overdue' },
  { amount: 8250, customer: 'Acme Logistics', id: 'INV-2047', status: 'Paid' },
  { amount: 6980, customer: 'Acme Robotics', id: 'INV-2052', status: 'Overdue' },
  { amount: 15120, customer: 'Acme Foods', id: 'INV-2063', status: 'Paid' },
]

const status = (value: string) => ({
  filters: [{ field: 'status', operator: 'any', values: [value] }],
})

export function Example() {
  return (
    <>
      <helix-quick-filters
        for="invoices"
        label="Invoice views"
      >
        <helix-quick-filter view={{ filters: [] }}>All</helix-quick-filter>
        <helix-quick-filter view={status('Overdue')}>Overdue</helix-quick-filter>
        <helix-quick-filter view={status('Paid')}>Paid</helix-quick-filter>
      </helix-quick-filters>
      <helix-data-table
        id="invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
      >
        <helix-table-column
          field="id"
          row-header
        >
          Invoice
        </helix-table-column>
        <helix-table-column field="customer">Customer</helix-table-column>
        <helix-table-column
          field="status"
          type="enum"
        >
          Status
        </helix-table-column>
        <helix-table-column
          field="amount"
          text-align="end"
          type="number"
        >
          Amount
        </helix-table-column>
      </helix-data-table>
    </>
  )
}
