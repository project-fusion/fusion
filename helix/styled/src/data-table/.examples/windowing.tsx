/* Five thousand generated rows. */
const rows = Array.from({ length: 5000 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
  size: 12_000 + index * 137,
}))

export function Example() {
  return (
    /* `windowed` draws only the rows in view, and the scrollbar still measures
       all five thousand. Sorting orders every row.

       `--data-table-block-size` sets the height of the scrolling box. It
       defaults to 24em. */
    <helix-data-table
      label="Assets"
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
