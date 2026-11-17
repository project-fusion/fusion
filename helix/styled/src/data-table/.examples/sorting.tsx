const RELEASES = [
  { downloads: 4210, owner: 'Platform', version: '2.4.0' },
  { downloads: 18904, owner: 'Design', version: '2.1.3' },
  { downloads: 920, owner: 'Platform', version: '2.5.0' },
  { downloads: 11280, owner: 'Growth', version: '2.2.0' },
  { downloads: 7615, owner: 'Design', version: '2.3.1' },
  { downloads: 2304, owner: 'Growth', version: '2.4.2' },
]

export function Example() {
  return (
    <helix-data-table
      label="Releases"
      reorderable
      row-key="version"
      rows={RELEASES}
    >
      <helix-table-column
        field="version"
        menu
        sortable
      >
        Version
      </helix-table-column>
      <helix-table-column
        field="downloads"
        menu
        sortable
        text-align="end"
      >
        Downloads
      </helix-table-column>
      <helix-table-column
        field="owner"
        menu
        sortable
      >
        Owner
      </helix-table-column>
    </helix-data-table>
  )
}
