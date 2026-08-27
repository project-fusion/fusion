import './preview.css'

export function Example() {
  return (
    <helix-headless-table label="Deployments">
      <helix-headless-table-column width="12rem">Service</helix-headless-table-column>
      <helix-headless-table-column>Region</helix-headless-table-column>
      <helix-headless-table-column>Status</helix-headless-table-column>

      <helix-headless-table-row>
        <helix-headless-table-cell header>helix-web</helix-headless-table-cell>
        <helix-headless-table-cell>us-east-1</helix-headless-table-cell>
        <helix-headless-table-cell>Healthy</helix-headless-table-cell>
      </helix-headless-table-row>
      <helix-headless-table-row>
        <helix-headless-table-cell header>cortex-core</helix-headless-table-cell>
        <helix-headless-table-cell>eu-west-2</helix-headless-table-cell>
        <helix-headless-table-cell>Healthy</helix-headless-table-cell>
      </helix-headless-table-row>
    </helix-headless-table>
  )
}
