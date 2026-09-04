/* Forty rows, generated rather than written out: what the example is about is
   the page size, and thirty-two more lines of plausible file names would bury
   it. */
const rows = Array.from({ length: 40 }, (_, index) => ({
  kind: index % 4 === 0 ? 'font' : 'image',
  name: `asset-${String(index + 1).padStart(3, '0')}.webp`,
  size: 12_000 + index * 837,
}))

export function Example() {
  return (
    /* `paginated` is not written here. A page size turns it on by itself,
       because a paged table with no way to change pages shows a reader the
       first eight rows and no way to learn there are more. Write
       `paginated={false}` to take the control back and put your own in the
       `footer` slot. */
    <helix-data-table label="Assets" page-size={8} rows={rows}>
      <helix-table-column field="name" sortable width="14rem">
        File
      </helix-table-column>
      <helix-table-column align="end" field="size" sortable>
        Size
      </helix-table-column>
      <helix-table-column field="kind">Kind</helix-table-column>
    </helix-data-table>
  )
}
