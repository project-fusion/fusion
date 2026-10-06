import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The hosts already read, so each is reported at most once in its life. */
const audited = new WeakSet<HTMLElement>()

/**
 * Reports a chart, a legend or a sparkline whose `for` names no table once the
 * page has loaded, the one mistake that leaves it drawing nothing and saying
 * nothing.
 *
 * **Read a task after `load`**, so a table later in the markup, or one a
 * script writes as the page starts, counts. A table a framework renders later
 * than that is reported, and the chart still draws it when it arrives.
 *
 * **In a development build only**, as `missing-name` is: every chart would pay
 * for a sentence meant for the person writing the page. Core imports it as
 * `#audit-source`, which `package.json` resolves here under the `development`
 * condition and to `audit-source-off.ts`, which does nothing, everywhere else.
 *
 * `table` answers what `for` resolves to now: the table, or null.
 */
export const auditSource = (
  host: HTMLElement & { for: string },
  table: () => Element | null,
): void => {
  if (host.for === '' || audited.has(host) || typeof document === 'undefined') {
    return
  }
  audited.add(host)
  const read = (): void => {
    setTimeout(() => {
      if (host.isConnected && host.for !== '' && !table()) {
        reportRuntime({
          kind: 'missing-table',
          message:
            `<${host.localName} for="${host.for}"> names no table, so it draws nothing. ` +
            'Point `for` at the id of a <table>, an element with role="table" or "grid", or a ' +
            'helix-table, in the same tree.',
          tag: host.localName,
        })
      }
    }, 0)
  }
  if (document.readyState === 'complete') {
    read()
  } else {
    window.addEventListener('load', read, { once: true })
  }
}
