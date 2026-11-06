import './preview.css'

const rows = [
  {
    amount: '$12,400.00',
    customer: 'Acme Corporation',
    id: 'INV-2041',
    status: 'Overdue',
    terms: 'Net 30',
  },
  {
    amount: '$8,250.00',
    customer: 'Acme Logistics',
    id: 'INV-2047',
    status: 'Paid',
    terms: 'Net 15',
  },
  {
    amount: '$6,980.00',
    customer: 'Acme Robotics',
    id: 'INV-2052',
    status: 'Draft',
    terms: 'Net 30',
  },
]

export function Example() {
  return (
    <div className="columns-pane">
      <helix-headless-column-manager for="invoices"></helix-headless-column-manager>
      <helix-headless-data-table
        id="invoices"
        label="Invoices"
        row-key="id"
        rows={rows}
        view={{
          columns: { hidden: ['terms'], order: [], pinned: { id: 'start' }, widths: {} },
          filters: [],
          pageSize: 0,
          query: '',
          sort: '',
        }}
      >
        <helix-headless-table-column
          field="id"
          row-header
        >
          Invoice
        </helix-headless-table-column>
        <helix-headless-table-column field="customer">Customer</helix-headless-table-column>
        <helix-headless-table-column field="status">Status</helix-headless-table-column>
        <helix-headless-table-column
          field="amount"
          text-align="end"
        >
          Amount
        </helix-headless-table-column>
        <helix-headless-table-column field="terms">Terms</helix-headless-table-column>
      </helix-headless-data-table>
    </div>
  )
}
