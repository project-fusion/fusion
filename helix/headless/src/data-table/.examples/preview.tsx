import './preview.css'

const rows = [
  { name: 'archive.tar.gz', region: 'us-east-1', size: 4823100 },
  { name: 'backup.sql', region: 'eu-central-1', size: 918400 },
  { name: 'index.json', region: 'us-east-1', size: 2100 },
  { name: 'manifest.yaml', region: 'ap-south-1', size: 812 },
  { name: 'profile.bin', region: 'eu-west-2', size: 61440 },
  { name: 'report.pdf', region: 'us-west-1', size: 1204000 },
]

export function Example() {
  return (
    <helix-headless-data-table
      default-sort="name:asc"
      label="Objects"
      page-size="4"
      rows={rows}
    >
      <helix-headless-table-column
        field="name"
        sortable
        width="14rem"
      >
        Name
      </helix-headless-table-column>
      <helix-headless-table-column
        field="region"
        sortable
      >
        Region
      </helix-headless-table-column>
      <helix-headless-table-column
        align="end"
        field="size"
        sortable
        width="8rem"
      >
        Size
      </helix-headless-table-column>
    </helix-headless-data-table>
  )
}
