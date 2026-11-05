const rows = [
  { name: 'api', owner: 'Ada Okafor', region: 'eu-central-1', status: 'Healthy' },
  { name: 'billing', owner: 'Lin Zhao', region: 'us-east-1', status: 'Degraded' },
  { name: 'search', owner: 'Sam Patel', region: 'ap-south-1', status: 'Healthy' },
]

export function Example() {
  return (
    <helix-data-table
      label="Services"
      rows={rows}
    >
      <helix-table-column field="name">Service</helix-table-column>
      <helix-table-column
        field="status"
        min-table-width="20rem"
      >
        Status
      </helix-table-column>
      <helix-table-column
        field="region"
        min-table-width="32rem"
      >
        Region
      </helix-table-column>
      <helix-table-column
        field="owner"
        min-table-width="40rem"
      >
        Owner
      </helix-table-column>
    </helix-data-table>
  )
}
