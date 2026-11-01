const rows = Array.from({ length: 18 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(3, '0')}.webp`,
  owner: index % 3 === 0 ? 'Brand' : 'Product',
  size: 12_000 + index * 837,
}))

export function Example() {
  return (
    <helix-data-table
      label="Assets"
      page-size={6}
      reorderable
      row-key="name"
      rows={rows}
    >
      <helix-table-column
        field="name"
        menu
        sortable
        width="minmax(12rem, 1fr)"
      >
        File
      </helix-table-column>
      <helix-table-column
        field="size"
        menu
        sortable
        text-align="end"
      >
        Size
      </helix-table-column>
      <helix-table-column
        field="kind"
        menu
      >
        Kind
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
