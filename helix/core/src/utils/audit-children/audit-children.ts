import { definedTags } from '../custom-element/custom-element.js'
import { howToRegister } from '../how-to-register/how-to-register.js'
import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The container and child tags already reported, so each pair is reported once a page. */
const reported = new Set<string>()

/** Runs a check once the page has loaded and painted. */
const afterPaint = (check: () => void): void => {
  const frame = (): void => {
    requestAnimationFrame(check)
  }
  if (document.readyState === 'complete') {
    frame()
  } else {
    window.addEventListener('load', frame, { once: true })
  }
}

/**
 * How long, in milliseconds, the page goes without loading a resource or
 * registering a Helix family before a child still undefined counts as missing.
 *
 * **An app that imports its families with `import()` registers them after
 * the page has loaded**, each as its chunk arrives, so a container can be
 * defined and painted while the chunk holding its children is still in
 * flight. Measured in the Hartley desktop app on October 14, 2026: Command was
 * defined 90 ms before Option, and its families arrived over 230 ms.
 */
export const QUIET = 500

/**
 * How much the page has loaded and registered so far. A chunk that lands
 * adds a resource, and a family it registers adds a tag.
 *
 * **Both, because neither is enough alone.** A bundler can serve a page
 * whose `#audit-children` is a second copy of core, whose `definedTags` then
 * sees none of the page's families, and the resource log stops growing once
 * its buffer is full.
 */
const activity = (): number =>
  definedTags().length + (performance.getEntriesByType?.('resource').length ?? 0)

/**
 * Resolves once `tag` is defined, or once the page has loaded and registered
 * nothing for `QUIET` milliseconds, whichever comes first.
 *
 * **Twenty periods at most.** A page that loads something more often than
 * every `QUIET` milliseconds is never quiet, so its missing child is reported
 * after twenty periods, ten seconds late.
 */
const settled = (tag: string): Promise<unknown> =>
  Promise.race([
    customElements.whenDefined(tag),
    new Promise<void>((resolve) => {
      let seen = activity()
      let periods = 0
      const wait = (): void => {
        setTimeout(() => {
          const now = activity()
          periods += 1
          if (now === seen || periods >= 20) {
            resolve()
          } else {
            seen = now
            wait()
          }
        }, QUIET)
      }
      wait()
    }),
  ])

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
 * Asked once the page has loaded and painted. A child still undefined then
 * is reported once the page has loaded and registered nothing for `QUIET`
 * milliseconds and the tag is still undefined, so an entry a later module or
 * a later chunk imports is not taken for a missing one.
 *
 * **In a development build only**, as `missing-name` is: every container would
 * pay for a sentence meant for the person writing the page. Core imports it as
 * `#audit-children`, which `package.json` resolves here under the
 * `development` condition and to `audit-children-off.ts`, which does nothing,
 * everywhere else.
 *
 * `part` is the child's tag after the tier, such as `option`, and `entry` its
 * family's entry, such as `option`; the host's `tier` gives the rest of both.
 * On a tier of your own the report names the tag to define.
 * `consequence` says what the missing child costs, after "so". `drawn` is for
 * children the host draws from data, such as the options of Listbox's `items`:
 * the page wrote none, so an undefined tag is reported without one in the
 * host's light DOM.
 */
export const auditChildren = (
  host: HTMLElement,
  part: string,
  entry: string,
  consequence: string,
  drawn = false,
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
  /** Whether there is nothing to report now. */
  const fine = (): boolean =>
    reported.has(key) ||
    !host.isConnected ||
    customElements.get(tag) !== undefined ||
    (!drawn && host.querySelector(tag) === null)
  const check = async (): Promise<void> => {
    if (fine()) {
      return
    }
    await settled(tag)
    if (fine()) {
      return
    }
    reported.add(key)
    reportRuntime({
      kind: 'unregistered-part',
      message: `<${tag}> in <${host.localName}> is not registered, so ${consequence}. ${howToRegister({ entry, host: host.localName, tag, tier })}`,
      tag: host.localName,
    })
  }
  afterPaint(() => void check())
}

/**
 * Reports a property set on a host whose behavior is in an entry of its own
 * that nobody imported, naming the entry.
 *
 * **The second shape of the same mistake.** Menu's filter is
 * `menu/filter`, so a menu that never filters carries none of its code, and a
 * page that sets `filterable` and imports only the menu gets a menu with no
 * field and nothing thrown. This says so, once for each host tag and entry on
 * the page, with the line to add.
 *
 * `attribute` is the one the page set, `entry` the entry after the tier's
 * package, such as `menu/filter`, and `consequence` what the missing entry
 * costs, after "so". `missing` is asked once the page has loaded and painted,
 * so an entry a later module imports is not taken for a missing one.
 */
export const auditEntry = (
  host: HTMLElement,
  attribute: string,
  entry: string,
  consequence: string,
  missing: () => boolean,
): void => {
  if (typeof window === 'undefined') {
    return
  }
  const key = `${host.localName}>${entry}`
  if (reported.has(key)) {
    return
  }
  afterPaint(() => {
    if (reported.has(key) || !host.isConnected || !missing()) {
      return
    }
    reported.add(key)
    const tier = (host.constructor as { tier?: string }).tier ?? 'helix-headless-'
    const pkg = tier === 'helix-' ? '@fusion.dev/helix' : '@fusion.dev/helix-headless'
    reportRuntime({
      kind: 'unregistered-part',
      message: `<${host.localName}> has \`${attribute}\` and its entry is not imported, so ${consequence}. Import '${pkg}/${entry}'.`,
      tag: host.localName,
    })
  })
}
