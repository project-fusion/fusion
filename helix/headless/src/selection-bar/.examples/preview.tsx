import './preview.css'

const rows = [
  { amount: '$12,400.00', customer: 'Acme Corporation', id: 'INV-2041' },
  { amount: '$8,250.00', customer: 'Acme Logistics', id: 'INV-2047' },
  { amount: '$6,980.00', customer: 'Acme Robotics', id: 'INV-2052' },
]

export function Example() {
  return (
    <helix-headless-data-table
      default-selected="INV-2041,INV-2052"
      label="Invoices"
      row-key="id"
      rows={rows}
      selectable
    >
      <helix-headless-input
        aria-label="Search invoices"
        slot="toolbar"
        type="search"
      ></helix-headless-input>
      <helix-headless-selection-bar slot="selection">
        <helix-headless-button>Archive</helix-headless-button>
        <helix-headless-button>Export</helix-headless-button>
      </helix-headless-selection-bar>
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
      >
        Amount
      </helix-headless-table-column>
    </helix-headless-data-table>
  )
}
