/* Five thousand rows, which is the point: this is the size at which laying out
   every row costs more than a frame, and the size a page of eight hides rather
   than solves. */
const rows = Array.from({ length: 5000 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(4, '0')}.webp`,
  size: 12_000 + index * 137,
}))

export function Example() {
  return (
    /* `windowed` draws the rows in view and stands empty space in for the rest,
       so the scrollbar still measures five thousand rows and the headings stay
       put while they pass under. Sorting still orders the whole result rather
       than the part on screen, which is the bug worth knowing this avoids.

       `--data-table-block-size` sets how tall the scrolling box is; it defaults
       to 24em, which is what this shows. */
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
