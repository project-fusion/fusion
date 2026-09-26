export function Example() {
  return (
    <helix-table label="Deployments">
      <helix-table-column width="12rem">Service</helix-table-column>
      <helix-table-column>Region</helix-table-column>
      <helix-table-column>Status</helix-table-column>

      <helix-table-row>
        <helix-table-cell header>web-app</helix-table-cell>
        <helix-table-cell>us-east-1</helix-table-cell>
        <helix-table-cell>Healthy</helix-table-cell>
      </helix-table-row>
      <helix-table-row>
        <helix-table-cell header>billing-api</helix-table-cell>
        <helix-table-cell>eu-west-2</helix-table-cell>
        <helix-table-cell>Healthy</helix-table-cell>
      </helix-table-row>
    </helix-table>
  )
}
