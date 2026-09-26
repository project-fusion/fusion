/* Five thousand generated rows in pages of five hundred. */
const rows = Array.from({ length: 5000 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
  size: 12_000 + index * 137,
}))

export function Example() {
  return (
    /* The table holds a page of five hundred rows and draws only the rows in
       view.

       `aria-rowindex` counts through both offsets, so the first row on page two
       is row 501. */
    <helix-data-table
      label="Assets"
      page-size={500}
      rows={rows}
      windowed
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
