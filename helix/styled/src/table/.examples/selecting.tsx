export function Example() {
  return (
    <helix-table
      default-selected="billing-api"
      selectable
    >
      <h3 slot="heading">Deployments to roll back</h3>
      <helix-table-column width="12rem">Service</helix-table-column>
      <helix-table-column>Region</helix-table-column>
      <helix-table-column>Status</helix-table-column>

      <helix-table-row value="web-app">
        <helix-table-cell header>web-app</helix-table-cell>
        <helix-table-cell>us-east-1</helix-table-cell>
        <helix-table-cell>Healthy</helix-table-cell>
      </helix-table-row>
      <helix-table-row value="billing-api">
        <helix-table-cell header>billing-api</helix-table-cell>
        <helix-table-cell>eu-west-2</helix-table-cell>
        <helix-table-cell>Degraded</helix-table-cell>
      </helix-table-row>
      <helix-table-row value="search">
        <helix-table-cell header>search</helix-table-cell>
        <helix-table-cell>ap-south-1</helix-table-cell>
        <helix-table-cell>Healthy</helix-table-cell>
      </helix-table-row>
    </helix-table>
  )
}
