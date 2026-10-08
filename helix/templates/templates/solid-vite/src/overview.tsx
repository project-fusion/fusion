import { For } from 'solid-js'
import { firstPage, members } from './data.ts'
import { DOCS } from './docs.ts'

/**
 * The data view.
 *
 * **The schema is markup and the data is a property.** The columns are
 * elements you can read in the HTML, and `rows` is the whole result handed over
 * at once, since a table of ten thousand rows cannot be written out as
 * elements. The table sorts, pages, and selects out of that array on its own.
 *
 * **The first page is markup too.** A page rendered on a server sends these rows
 * in its HTML, so the table is readable before the script runs. Here the table
 * draws its own rows from `members` at once, and the rows keep the page the same
 * as one a server renders.
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
          columns="minmax(5.5rem, 1.6fr) minmax(4.5rem, 1fr) minmax(4.5rem, 1fr) max-content"
          default-sort="name:asc"
          label="Roster"
          page-size={6}
          row-key="id"
          rows={members}
          selectable
        >
          {/* **`columns` says what each column may give up**, a track to a column:
              a floor, which is what the words need, and a share of the slack. The
              numerals take `max-content`, their one right width. At 390 the four
              columns and the checkboxes fit the box, and below 376 the table
              scrolls its own box. On the table, so a page rendered on a server is
              laid out at these widths before the script runs. */}
          <helix-table-column field="name" sortable>
            Name
          </helix-table-column>
          <helix-table-column field="team" sortable>
            Team
          </helix-table-column>
          <helix-table-column field="role">
            Role
          </helix-table-column>
          {/* `end` lines the digits up under each other. */}
          <helix-table-column field="reviews" sortable text-align="end">
            Reviews
          </helix-table-column>

          <For each={firstPage}>
            {(member) => (
              <helix-table-row>
                <helix-table-cell header>{member.name}</helix-table-cell>
                <helix-table-cell>{member.team}</helix-table-cell>
                <helix-table-cell>{member.role}</helix-table-cell>
                <helix-table-cell>{member.reviews}</helix-table-cell>
              </helix-table-row>
            )}
          </For>

          {/* The footer is a row across the table: anything you slot goes at the
              start, and the table's own pagination sits at the end. */}
          <helix-text emphasis="subtle" slot="footer" variant="caption">
            {members.length} people
          </helix-text>
        </helix-data-table>

        {/* A footnote to the table, so it takes the section's gap. */}
        <helix-text as="p" emphasis="muted" variant="caption">
          Filtering, column reordering, resizing, virtualized rows, and a server mode for large
          results are on{' '}
          <a data-link href={DOCS.table}>
            the component's own page
          </a>
          .
        </helix-text>
      </section>
    </div>
  )
}
