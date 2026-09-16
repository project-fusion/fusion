import { members } from './data'
import { DOCS } from './docs'

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
 * is chosen by its identity rather than by where it happened to be sitting, and
 * `app.css` paints the chosen row through the parts the table names for it.
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
          default-sort="name:asc"
          label="Roster"
          page-size={6}
          row-key="id"
          rows={members}
          selectable
        >
          {/* **Every column declares what it may give up, and that is the whole of
              the narrow-window story.** A column left to itself takes
              `minmax(max-content, 1fr)`, which refuses to go below its longest
              cell however little room there is, so the last column is pushed
              outside the box and the reader has to scroll the table sideways to
              read a value. A floor and a share instead: the floor is what the
              words need, the share is how the slack is divided. Measured 16 Sep
              2026: at 390 the four columns and the checkboxes come to 358 in a box
              of 358, so nothing is cut and nothing wraps; the floors alone come to
              344, so at a 376 pixel window they exactly fit and below it the table
              scrolls its own box, which is honest, and it fades whichever edge has
              more behind it. */}
          <helix-table-column field="name" sortable width="minmax(5.5rem, 1.6fr)">
            Name
          </helix-table-column>
          <helix-table-column field="team" sortable width="minmax(4.5rem, 1fr)">
            Team
          </helix-table-column>
          <helix-table-column field="role" width="minmax(4.5rem, 1fr)">
            Role
          </helix-table-column>
          {/* `end` lines the digits up under each other, which is the whole reason
              a number column is a different thing from a text one. `max-content`
              because a column of numerals has one right width and no reason to
              take a share of anything. */}
          <helix-table-column align="end" field="reviews" sortable width="max-content">
            Reviews
          </helix-table-column>

          {/* The footer is a row across the table, not a corner: anything you slot
              goes at the start and the table's own pagination sits at the end. */}
          <helix-text emphasis="subtle" slot="footer" variant="caption">
            {members.length} people
          </helix-text>
        </helix-data-table>

        {/* A footnote to the table rather than the next block of the page, so it
            takes the section's gap and not the stack's. */}
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
