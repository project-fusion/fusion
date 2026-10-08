import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The container and child tags already reported, so each pair is reported once a page. */
const reported = new Set<string>()

/**
 * Reports a child from another family that a container holds and nobody
 * registered, naming the entry to import.
 *
 * **A container does not register another family's children.** An option
 * belongs to the Option family, and a page writing one inside a Select imports
 * `@fusion.dev/helix/option` itself, as it imports the Select. Left out, the
 * option is an unknown element: the list reads no choices and nothing throws.
 * This says so, once for each container tag and child tag on the page, with
 * the line to add.
 *
 * Asked once the page has loaded and painted, so an entry a later module
 * imports is not taken for a missing one.
 *
 * **In a development build only**, as `missing-name` is: every container would
 * pay for a sentence meant for the person writing the page. Core imports it as
 * `#audit-children`, which `package.json` resolves here under the
 * `development` condition and to `audit-children-off.ts`, which does nothing,
 * everywhere else.
 *
 * `part` is the child's tag after the tier, such as `option`, and `entry` its
 * family's entry, such as `option`; the host's `tier` gives the rest of both.
 * `consequence` says what the missing child costs, after "so".
 */
export const auditChildren = (
  host: HTMLElement,
  part: string,
  entry: string,
  consequence: string,
): void => {
  if (typeof window === 'undefined') {
    return
  }
  const tier = (host.constructor as { tier?: string }).tier ?? 'helix-headless-'
  const tag = `${tier}${part}`
  const key = `${host.localName}>${tag}`
  if (reported.has(key)) {
    return
  }
  const check = (): void => {
    if (
      reported.has(key) ||
      !host.isConnected ||
      customElements.get(tag) !== undefined ||
      host.querySelector(tag) === null
    ) {
      return
    }
    reported.add(key)
    const pkg = tier === 'helix-' ? '@fusion.dev/helix' : '@fusion.dev/helix-headless'
    reportRuntime({
      kind: 'unregistered-part',
      message: `<${tag}> in <${host.localName}> is not registered, so ${consequence}. Import '${pkg}/${entry}'.`,
      tag: host.localName,
    })
  }
  const frame = (): void => {
    requestAnimationFrame(check)
  }
  if (document.readyState === 'complete') {
    frame()
  } else {
    window.addEventListener('load', frame, { once: true })
  }
}
