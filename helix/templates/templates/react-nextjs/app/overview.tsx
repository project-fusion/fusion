import { members } from './data'

/**
 * The data view.
 *
 * **The schema is markup and the data is a property.** The columns are elements
 * you can read in the HTML, and `rows` is the whole result handed over at once,
 * because a table of ten thousand rows cannot be written out as elements. The
 * table sorts, pages and selects out of that array on its own: none of it is
 * wired up here, and none of it is a handler you have to write.
 *
 * **Selection is keyed on `row-key`, so it survives a sort and a page.** A row
 * is chosen by its identity rather than by where it happened to be sitting.
 */
export function Overview() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-flex direction="column" gap="2xs">
        <helix-text as="h1" variant="heading">
          Roster
        </helix-text>
        <helix-text emphasis="muted">
          Twelve people from a local module. Sort a column, turn a page, or tick a row.
        </helix-text>
      </helix-flex>

      <helix-data-table
        default-sort="name:asc"
        label="Roster"
        page-size={6}
        row-key="id"
        rows={members}
        selectable
      >
        <helix-table-column field="name" sortable>
          Name
        </helix-table-column>
        <helix-table-column field="team" sortable>
          Team
        </helix-table-column>
        <helix-table-column field="role">Role</helix-table-column>
        {/* `end` lines the digits up under each other, which is the whole reason
            a number column is a different thing from a text one. */}
        <helix-table-column align="end" field="reviews" sortable>
          Reviews
        </helix-table-column>
      </helix-data-table>
    </helix-flex>
  )
}
