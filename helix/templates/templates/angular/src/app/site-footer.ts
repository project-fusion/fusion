import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { DOCS } from './docs'

/**
 * The bar's counterpart, on every route.
 *
 * **It puts a floor under the content.** The overview is a heading, a table,
 * and a caption, which on a tall window left the bottom third of the screen
 * empty. The footer is also where the links you want once belong.
 *
 * `data-link="quiet"` sets a link in the muted ink with no underline, and it
 * takes the foreground on hover, which suits a row of links under a rule.
 */
@Component({
  host: { class: 'site-footer' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'footer[app-site-footer]',
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  protected readonly docs = DOCS
}
