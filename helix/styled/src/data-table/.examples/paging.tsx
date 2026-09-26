/* Forty generated rows. */
const rows = Array.from({ length: 40 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(3, '0')}.webp`,
  size: 12_000 + index * 837,
}))

export function Example() {
  return (
    /* A page size turns on pagination by itself. Write `paginated={false}` to
       turn it off and put your own control in the `footer` slot. */
    <helix-data-table
      label="Assets"
      page-size={8}
      rows={rows}
    >
      <helix-table-column
        field="name"
        sortable
        width="14rem"
      >
        File
      </helix-table-column>
      <helix-table-column
        field="size"
        sortable
        text-align="end"
      >
        Size
      </helix-table-column>
      <helix-table-column field="kind">Kind</helix-table-column>
    </helix-data-table>
  )
}
