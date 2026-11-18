export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-table
        label="Deployments"
        loading
        loading-text="Loading deployments"
      >
        <helix-table-column width="12rem">Service</helix-table-column>
        <helix-table-column>Region</helix-table-column>
        <helix-table-column>Status</helix-table-column>
      </helix-table>

      <helix-table
        empty-text="No incidents this week"
        label="Incidents"
      >
        <helix-table-column width="12rem">Service</helix-table-column>
        <helix-table-column>Started</helix-table-column>
        <helix-table-column>Status</helix-table-column>
      </helix-table>
    </helix-flex>
  )
}
