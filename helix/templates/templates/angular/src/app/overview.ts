import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { members } from './data'
import { DOCS } from './docs'

/**
 * The data view.
 *
 * **The schema is markup and the data is a property.** The columns are
 * elements you can read in the HTML, and `[rows]` hands over the whole result
 * at once, since a table of ten thousand rows cannot be written out as
 * elements. The table sorts, pages, and selects out of that array on its own.
 *
 * **Selection is keyed on `row-key`, so it survives a sort and a page.**
 * `app.css` paints the chosen row through the parts the table names for it.
 */
@Component({
  host: { class: 'stack' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'div[app-overview]',
  templateUrl: './overview.html',
})
export class Overview {
  protected readonly docs = DOCS
  protected readonly members = members
}
