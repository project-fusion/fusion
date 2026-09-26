export function Example() {
  return (
    <helix-table
      columns="10rem 1fr 5rem"
      label="Customers"
    >
      <helix-table-column>Customer</helix-table-column>
      <helix-table-column>Last order</helix-table-column>
      <helix-table-column text-align="end">Orders</helix-table-column>

      <helix-table-row>
        <helix-table-cell header>Alex Kim</helix-table-cell>
        <helix-table-cell>Desk lamp and two chairs</helix-table-cell>
        <helix-table-cell>34</helix-table-cell>
      </helix-table-row>
      <helix-table-row>
        <helix-table-cell header>Sam Lee</helix-table-cell>
        <helix-table-cell>Invoice #1042 paid</helix-table-cell>
        <helix-table-cell>18</helix-table-cell>
      </helix-table-row>
    </helix-table>
  )
}
