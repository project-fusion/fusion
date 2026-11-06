import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The hosts already reported, so each is reported at most once in its life. */
const audited = new WeakSet<HTMLElement>()

/**
 * Reports a list at `kind="description"` whose rows nobody presses, selects,
 * or reorders.
 *
 * **`kind="description"` is for an interactive list**, such as a list of
 * settings whose rows open a page each. A static list of terms and their
 * meanings is Description List's job: its items are a real `<dt>` and `<dd>`,
 * and a List renders neither. So the sentence names the family to write in
 * its place.
 *
 * **In a development build only**, as `missing-name` is: every list would pay
 * for a sentence meant for the person writing the page. Core imports it as
 * `#audit-description`, which `package.json` resolves here under the
 * `development` condition and to `audit-description-off.ts`, which does
 * nothing, everywhere else.
 *
 * `interactive` says whether the list's rows are pressed, selected, or
 * reordered: a `selection-mode`, `reorderable`, or a row with an `href`.
 */
export const auditDescription = (host: HTMLElement, interactive: boolean): void => {
  if (interactive || audited.has(host)) {
    return
  }
  audited.add(host)
  const family = host.localName.replace(/-list$/, '-description-list')
  reportRuntime({
    kind: 'static-description',
    message:
      `<${host.localName} kind="description"> has no row a reader presses, selects, or reorders. ` +
      'A static list of terms and their meanings is a Description List: ' +
      `write <${family}> with one <${family}-item> for each term.`,
    tag: host.localName,
  })
}
