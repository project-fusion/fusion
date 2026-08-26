/**
 * A custom-elements manifest, indexed for lookup.
 *
 * The manifest is the only thing that knows which parts a tag publishes and
 * which hooks it answers, and it is already a dependency of anyone consuming
 * Helix: `package.json` points at it through `customElements`, and every editor
 * integration reads it. So the collector takes it as input rather than shipping
 * a copy, which is also what keeps a diagnostics release from having to follow
 * a library release.
 *
 * **Both tiers are passed together when both are installed.** A part that
 * `@helix-io/headless` publishes and `@helix-io/styled` does not forward is a
 * real fault (148 of them across 19 families, found by hand), and it is only
 * visible when the two manifests are compared. Which manifest an entry came
 * from is therefore tracked rather than merged away.
 */

/** The subset of the manifest schema this reads. Nothing else is touched. */
export interface ManifestSource {
  modules?: Array<{
    declarations?: Array<{
      cssParts?: Array<{ name: string }>
      cssProperties?: Array<{ name: string }>
      tagName?: string
    }>
  }>
}

/** One manifest, and which tier shipped it. */
export interface Tier {
  manifest: ManifestSource
  /** Package name, used verbatim in a finding's message. */
  name: string
}

/**
 * What one tag publishes, per tier.
 *
 * Not `Element`, which it was: that shadows the DOM's own `Element` wherever
 * both are in scope, and `analyze.ts` needs both in the same file.
 */
export interface Published {
  hooks: Map<string, Set<string>>
  parts: Map<string, Set<string>>
}

/**
 * Every tag across every tier, with the tiers that publish each part and hook.
 *
 * A `Set` of tier names rather than a boolean because the useful finding is not
 * "this part does not exist" but "this part exists on the headless tier and the
 * styled one did not forward it", and that sentence needs the names.
 */
export const index = (tiers: Tier[]): Map<string, Published> => {
  const tags = new Map<string, Published>()
  for (const tier of tiers) {
    for (const module of tier.manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        const tag = declaration.tagName
        if (!tag) {
          continue
        }
        let element = tags.get(tag)
        if (!element) {
          element = { hooks: new Map(), parts: new Map() }
          tags.set(tag, element)
        }
        for (const [field, into] of [
          [declaration.cssParts, element.parts],
          [declaration.cssProperties, element.hooks],
        ] as const) {
          for (const entry of field ?? []) {
            const publishers = into.get(entry.name) ?? new Set<string>()
            publishers.add(tier.name)
            into.set(entry.name, publishers)
          }
        }
      }
    }
  }
  return tags
}

/**
 * The published name closest to a wrong one, or nothing when none is close.
 *
 * **A suggestion is the difference between a finding and a chore.**
 * `--breadcrumb-hover-color` is wrong because the family is `breadcrumbs`, and
 * a reader told only that the hook is unknown has to go and read the manifest;
 * told that `--breadcrumbs-hover-color` exists, they are done.
 *
 * Levenshtein with a ceiling of a third of the name's length. The ceiling is
 * what stops a suggestion from being noise: `--button-x` is not a typo for
 * `--button-background-color` however close they sort, and a confident wrong
 * suggestion costs more than none.
 */
export const nearest = (wrong: string, candidates: Iterable<string>): string | undefined => {
  let best: string | undefined
  let distance = Math.floor(wrong.length / 3)
  for (const candidate of candidates) {
    const found = within(wrong, candidate, distance)
    if (found !== undefined && found < distance + 1) {
      best = candidate
      distance = found
    }
  }
  return best
}

/** Levenshtein distance, or `undefined` once it is certainly over the ceiling. */
const within = (from: string, to: string, ceiling: number): number | undefined => {
  if (Math.abs(from.length - to.length) > ceiling) {
    return undefined
  }
  let previous = Array.from({ length: to.length + 1 }, (_, column) => column)
  for (let row = 1; row <= from.length; row += 1) {
    const current = [row]
    for (let column = 1; column <= to.length; column += 1) {
      current[column] = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + (from[row - 1] === to[column - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  const total = previous[to.length]
  return total !== undefined && total <= ceiling ? total : undefined
}
