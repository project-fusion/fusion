import './bleed.css'

const rows = [
  { count: 12, name: 'api', region: 'eu-central-1' },
  { count: 3, name: 'web', region: 'us-east-1' },
  { count: 5, name: 'worker', region: 'us-west-2' },
]

export function Example() {
  return (
    <div className="panel">
      <p className="heading">Services</p>
      <helix-divider></helix-divider>
      <helix-data-table
        bleed
        default-selected="web,worker"
        label="Services"
        row-key="name"
        rows={rows}
        selectable
      >
        <helix-table-column field="name">Name</helix-table-column>
        <helix-table-column field="region">Region</helix-table-column>
        <helix-table-column
          field="count"
          text-align="end"
        >
          Instances
        </helix-table-column>
      </helix-data-table>
    </div>
  )
}
