import { firstPage, members } from './data.js'
import { DOCS } from './docs.js'

/**
 * The data view.
 *
 * **The schema is markup and the data is a property.** The columns are elements
 * you can read in the HTML, and `rows` is the whole result handed over at once,
 * since a table of ten thousand rows cannot be written out as elements. The
 * table sorts, pages, and selects out of that array on its own, with no handler
 * for you to write.
 *
 * **The first page is markup too.** A page rendered on a server sends these rows
 * in its HTML, so the table is readable before the script runs. Here the table
 * draws its own rows from `members` at once, and the rows keep the page the same
 * as one a server renders.
 *
 * **Selection is keyed on `row-key`, so it survives a sort and a page.** A row
 * is chosen by its identity, wherever it sits, and `app.css` paints the chosen
 * row through the parts the table names for it.
 */
export function Overview() {
  return (
    <div className="stack">
      <header className="hero">
        <helix-text emphasis="muted" variant="label">
          Data view
        </helix-text>
        <helix-text as="h1" variant="heading">
          Roster
        </helix-text>
        <helix-text as="p" className="lede" emphasis="muted" variant="body">
          Twelve people from a local module. Sort a column, turn a page, or tick a row and watch the
          rule in <helix-code>src/app.css</helix-code> paint it.
        </helix-text>
      </header>

      <section className="section">
        <helix-data-table
          columns="minmax(5.5rem, 1.6fr) minmax(4.5rem, 1fr) minmax(4.5rem, 1fr) max-content"
          default-sort="name:asc"
          label="Roster"
          page-size={6}
          row-key="id"
          rows={members}
          selectable
        >
          {/* **`columns` says what each column may give up, which is the whole
              of the narrow-window story**, one track to a column in the order
              they are written. A column left to itself takes
              `minmax(max-content, 1fr)`, which never goes below its longest
              cell, so the last column is pushed outside the box and you have to
              scroll the table sideways to read a value. Each track here has a
              floor and a share: the floor is what the words need, and the share
              is how the spare width is divided. Measured September 16, 2026: at
              390 the four columns and the checkboxes come to 358 in a box of
              358, so nothing is cut and nothing wraps. The floors alone come to
              344, so at a 376 pixel window they exactly fit, and below it the
              table scrolls its own box and fades whichever edge has more behind
              it. The last is `max-content`, since a column of numerals has one
              right width. On the table, so a page rendered on a server is laid
              out at these widths before the script runs. */}
          <helix-table-column field="name" sortable>
            Name
          </helix-table-column>
          <helix-table-column field="team" sortable>
            Team
          </helix-table-column>
          <helix-table-column field="role">
            Role
          </helix-table-column>
          {/* `end` lines the digits up under each other, which is what makes a
              number column different from a text one. */}
          <helix-table-column field="reviews" sortable text-align="end">
            Reviews
          </helix-table-column>

          {firstPage.map((member) => (
            <helix-table-row key={member.id}>
              <helix-table-cell header>{member.name}</helix-table-cell>
              <helix-table-cell>{member.team}</helix-table-cell>
              <helix-table-cell>{member.role}</helix-table-cell>
              <helix-table-cell>{member.reviews}</helix-table-cell>
            </helix-table-row>
          ))}

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
