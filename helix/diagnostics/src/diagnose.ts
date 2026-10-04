/**
 * One run over a page: `diagnose()`, which everything else in this package
 * calls, and which a page or a test may call directly.
 */
import { analyze, markup, registrations, skew, versionSkew } from './analyze.js'
import { collect } from './collect.js'
import { type Config, pagePattern, resolveConfig } from './config.js'
import { identify } from './identity.js'
import type { Tier } from './manifest.js'
import { index, lintFor, versionsOf } from './manifest.js'
import { pageOf } from './page.js'
import type { Environment, Report } from './report.js'
import { applyRules, overridesOf } from './rules.js'
import { listed, loadedVersions, styled, type Watcher, walk } from './usage.js'
import { VERSION } from './version.js'

/**
 * What to look at, what to compare it against, and the settings for this
 * call, which win over the project's file field by field.
 */
export interface Options extends Config {
  /**
   * `duplicateRegistrations` from `@fusion.dev/helix-core`, when it is installed.
   *
   * **Passed in rather than imported**, so this package does not depend on the
   * library it diagnoses. A diagnostics release would otherwise have to follow
   * every core release, and a consumer on an older core could not run a newer
   * collector at all. Omitted, the duplicate check falls back to comparing a
   * live element against its own registered class, which finds the same fault
   * from outside and cannot name the losing class.
   */
  duplicates?: (() => string[]) | undefined
  /**
   * Where this run happens, as the project declares it. **Never inferred**:
   * a bundler's `development` condition misfires both ways, and a run whose
   * environment nobody declared is never sent.
   */
  environment?: Environment | undefined
  /**
   * The project's own file, `helix-diagnostics.json`, parsed. The build reads
   * the file, since the page cannot: import the JSON and pass it here.
   */
  file?: Config | undefined
  /**
   * The document to scan. Defaults to the ambient one.
   *
   * Present so a test can hand over a constructed document, and so a page with
   * an iframe it owns can scan that too.
   */
  from?: Document | undefined
  /**
   * The page's path, for a router that knows its own pattern, such as
   * `/products/[id]`. Otherwise read from the location and made a pattern, as
   * `detail.pages` says.
   */
  page?: string | undefined
  /**
   * The manifests to check against, one per installed tier.
   *
   * **Pass both tiers when both are installed.** A part `@fusion.dev/helix-headless`
   * publishes and `@fusion.dev/helix` never forwarded is a real fault and is
   * invisible to either manifest alone.
   */
  tiers: Tier[]
  /**
   * A watcher from `watch()`, so usage counts every element that rendered
   * since it began. Without one, usage counts the elements in the page now.
   */
  watcher?: Watcher | undefined
}

/** A new identity for a run. `randomUUID` is absent outside a secure context. */
const runId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

/**
 * One run over the page.
 *
 * **It returns coverage and findings together and offers no way to have one
 * without the other.** A collector that cannot read cross-origin sheets reports
 * the same empty array whether it read everything or nothing. An empty
 * `findings` is only meaningful beside the `coverage` that says what was looked
 * at.
 *
 * Cheap enough to call on a route change. There is no observer and no polling
 * loop: sheets that arrive later are found by calling it again.
 *
 * **A manifest from another version is refused**, with one finding that says
 * so in place of every other: by version where both sides carry one, and
 * otherwise by a part the manifest does not list rendering in the page.
 */
export const diagnose = (options: Options): Report => {
  const started = performance.now()
  const at = new Date().toISOString()
  const { duplicates, environment, file, from, page, tiers, watcher, ...call } = options
  if (tiers.length === 0) {
    throw new Error(
      'diagnose() needs at least one manifest. Without one every part name is unknown and every finding would be noise.',
    )
  }
  const resolved = resolveConfig(file, call)
  const { detail } = resolved.configuration
  const document_ = from ?? globalThis.document
  /* One walk of the page, which every check below reads. */
  const walked = pageOf(document_)
  const { answered, coverage, readers, rules: located, used } = collect(document_, walked)
  /* Each tier as lint data once, which the index and the versions both read. */
  const lints = tiers.map((tier) => ({ lint: lintFor(tier) }))
  const tags = index(lints)
  const counted = watcher ? watcher.counts() : walk(document_, walked)
  const seen = loadedVersions()
  const manifests = versionsOf(lints)

  /* **Refused on a manifest from another version**, unless the project
     turned that finding off, in which case it is judged as usual: a report
     that lost every finding to a check nobody wanted would read as a clean
     page, which is the silent pass this package exists to prevent. Where both
     sides carry a version, the numbers decide; inferring from parts is only
     for a manifest or a page too old to say. */
  const byVersion = versionSkew(manifests, seen)
  const known = seen.length > 0 && Object.keys(manifests).length > 0
  const skewed = applyRules(
    (byVersion.length > 0 ? byVersion : known ? [] : skew(tags, document_, walked)).map((one) =>
      identify(one, tags),
    ),
    file?.rules,
    call.rules,
  )
  const judged =
    skewed.findings.length > 0
      ? { findings: [], silenced: [] }
      : applyRules(
          [
            ...analyze(located, tags, document_, answered, used, readers),
            ...markup(tags, document_, walked),
            ...registrations(document_, duplicates, walked),
          ].map((one) => identify(one, tags)),
          file?.rules,
          call.rules,
        )

  const path = page ?? globalThis.location?.pathname
  const shownPage =
    path === undefined || detail.pages === 'none'
      ? undefined
      : detail.pages === 'patterns'
        ? pagePattern(path)
        : path
  return {
    configuration: {
      ...resolved.configuration,
      overrides: overridesOf(file?.rules, call.rules),
      silenced: [...skewed.silenced, ...judged.silenced],
    },
    coverage,
    findings: [...skewed.findings, ...judged.findings],
    project: resolved.project,
    run: {
      at,
      duration: Math.round(performance.now() - started),
      id: runId(),
      source: 'page',
      ...(environment === undefined ? {} : { environment }),
      ...(shownPage === undefined ? {} : { page: shownPage }),
    },
    schema: 1,
    usage: {
      ...listed(counted, tags),
      ...styled(located, tags, answered, detail.hookValues),
      counted: watcher ? 'watched' : 'walked',
    },
    versions: { collector: VERSION, helix: seen, manifests, rules: VERSION },
    withheld: Object.entries(resolved.send)
      .filter(([, sent]) => !sent.on)
      .map(([category, sent]) => ({
        category: category as Report['withheld'][number]['category'],
        decidedBy: sent.decidedBy,
      })),
  }
}
