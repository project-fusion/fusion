const rows = [
  { amount: 12400, due: '2026-10-12', id: 'INV-2041', owner: 'Dana Ruiz', paid: false },
  { amount: 8250, due: '2026-10-18', id: 'INV-2047', owner: 'Sam Okafor', paid: true },
  { amount: 6980, due: '2026-10-21', id: 'INV-2052', owner: 'Priya Shah', paid: false },
]

export function Example() {
  return (
    <helix-data-table
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
      <helix-table-column
        editable
        field="owner"
        required
        type="enum"
      >
        Owner
      </helix-table-column>
      <helix-table-column
        editable
        field="amount"
        min="0"
        text-align="end"
        type="number"
      >
        Amount
      </helix-table-column>
      <helix-table-column
        editable
        field="due"
        type="date"
      >
        Due
      </helix-table-column>
      <helix-table-column
        editable
        field="paid"
        type="boolean"
      >
        Paid
      </helix-table-column>
    </helix-data-table>
  )
}
