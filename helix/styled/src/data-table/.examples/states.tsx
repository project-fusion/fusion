export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-data-table
        label="Invoices"
        loading
        loading-text="Loading invoices"
      >
        <helix-table-column field="number">Invoice</helix-table-column>
        <helix-table-column field="customer">Customer</helix-table-column>
        <helix-table-column
          field="total"
          text-align="end"
        >
          Total
        </helix-table-column>
      </helix-data-table>

      <helix-data-table
        empty-text="No refunds this month"
        label="Refunds"
      >
        <helix-table-column field="number">Refund</helix-table-column>
        <helix-table-column field="customer">Customer</helix-table-column>
        <helix-table-column
          field="total"
          text-align="end"
        >
          Total
        </helix-table-column>
      </helix-data-table>
    </helix-flex>
  )
}
