import { members } from './data.ts'
import { DOCS } from './docs.ts'

/**
 * The data view.
 *
 * **The schema is markup and the data is a property.** The columns are
 * elements you can read in the HTML, and `rows` is the whole result handed over
 * at once, since a table of ten thousand rows cannot be written out as
 * elements. The table sorts, pages, and selects out of that array on its own.
 *
 * **Selection is keyed on `row-key`, so it survives a sort and a page.**
 * `app.css` paints the chosen row through the parts the table names for it.
 */
export function Overview() {
  return (
    <div class="stack">
      <header class="hero">
        <helix-text emphasis="muted" variant="label">
          Data view
        </helix-text>
        <helix-text as="h1" variant="heading">
          Roster
        </helix-text>
        <helix-text as="p" class="lede" emphasis="muted" variant="body">
          Twelve people from a local module. Sort a column, turn a page, or tick a row and watch the
          rule in <helix-code>src/app.css</helix-code> paint it.
        </helix-text>
      </header>

      <section class="section">
        <helix-data-table
          default-sort="name:asc"
          label="Roster"
          page-size={6}
          row-key="id"
          rows={members}
          selectable
        >
          {/* **Every column declares what it may give up.** A floor and a share:
              the floor is what the words need, and the share is how the slack
              is divided. At 390 the four columns and the checkboxes fit the
              box, and below 376 the table scrolls its own box. */}
          <helix-table-column field="name" sortable width="minmax(5.5rem, 1.6fr)">
            Name
          </helix-table-column>
          <helix-table-column field="team" sortable width="minmax(4.5rem, 1fr)">
            Team
          </helix-table-column>
          <helix-table-column field="role" width="minmax(4.5rem, 1fr)">
            Role
          </helix-table-column>
          {/* `end` lines the digits up under each other. `max-content`, since a
              column of numerals has one right width. */}
          <helix-table-column field="reviews" sortable text-align="end" width="max-content">
            Reviews
          </helix-table-column>

          {/* The footer is a row across the table: anything you slot goes at the
              start, and the table's own pagination sits at the end. */}
          <helix-text emphasis="subtle" slot="footer" variant="caption">
            {members.length} people
          </helix-text>
        </helix-data-table>

        {/* A footnote to the table, so it takes the section's gap. */}
        <helix-text as="p" emphasis="muted" variant="caption">
          Filtering, column reordering, resizing, virtualized rows and a server mode that asks you
          for a page are all on{' '}
          <a data-link href={DOCS.table}>
            the component's own page
          </a>
          .
        </helix-text>
      </section>
    </div>
  )
}
