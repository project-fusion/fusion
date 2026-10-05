export function Example() {
  return (
    <helix-grid
      column-gap="md"
      columns={3}
      row-gap="sm"
    >
      <helix-text
        as="h3"
        data-grid-span="full"
      >
        Reports
      </helix-text>
      <helix-card
        data-grid-span="2"
        separation="outlined"
      >
        Revenue
      </helix-card>
      <helix-card separation="outlined">Refunds</helix-card>
      <helix-card separation="outlined">Orders</helix-card>
      <helix-card separation="outlined">Invoices</helix-card>
      <helix-card separation="outlined">Customers</helix-card>
    </helix-grid>
  )
}
