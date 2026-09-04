/* Five thousand rows in pages of five hundred: enough that neither mechanism
   alone is the answer, which is the case this example exists for. */
const rows = Array.from({ length: 5000 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
  size: 12_000 + index * 137,
}))

export function Example() {
  return (
    /* **The two are different questions and both are answered here.** The page
       is the slice of the result the table holds -- five hundred rows, the size
       a request would sensibly fetch -- and the window is the part of that slice
       it draws. A page of five hundred is a reasonable fetch and a poor render,
       which is exactly when writing both is right.

       `aria-rowindex` counts through both offsets, so row one of the window on
       page two is row 501 of the result and a screen reader says so. */
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
        align="end"
        field="size"
        sortable
      >
        Size
      </helix-table-column>
      <helix-table-column field="kind">Kind</helix-table-column>
    </helix-data-table>
  )
}
