import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { roster } from './data'
import { DOCS } from './docs'

/**
 * The first screen, and the only page here about the starter itself.
 *
 * Delete it once you know your way around: nothing else imports it, and the
 * route it answers becomes yours.
 *
 * **The calls to action are anchors.** A button that navigates is a link
 * dressed as a button, and the two are different things to a keyboard and to
 * a screen reader. The base stylesheet styles an anchor that asks with
 * `data-button`, so a link can look like one and stay a link.
 */
@Component({
  host: { class: 'stack' },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'div[app-landing]',
  templateUrl: './landing.html',
})
export class Landing {
  protected readonly docs = DOCS
  protected readonly roster = roster
  /* **A locale named, so the number reads the same everywhere.**
     `toLocaleString()` with no argument reads the machine's locale, so the same
     number is grouped two ways on two machines. */
  protected readonly figure = new Intl.NumberFormat('en-US')
}
