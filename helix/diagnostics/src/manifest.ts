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
 * `@fusion.dev/helix-headless` publishes and `@fusion.dev/helix` does not forward is a
 * real fault (148 of them across 19 families, found by hand), and it is only
 * visible when the two manifests are compared. Which manifest an entry came
 * from is therefore tracked rather than merged away.
 */

/** The subset of the manifest schema this reads. Nothing else is touched. */
export interface ManifestSource {
  /**
   * The package and version the manifest describes, which `helix manifest
   * build` writes from the package's `package.json`. Absent from a manifest
   * built before 0.137.
   */
  helix?: { package?: string; version?: string }
  modules?: Array<{
    /** Where the module is, which names the family: `src/button/root/button-root.ts`. */
    path?: string
    declarations?: Array<{
      attributes?: Array<{ name: string; type?: { text?: string } }>
      members?: Array<{ kind?: string; name: string; readonly?: boolean; static?: boolean }>
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
 * Not `Element`: that name shadows the DOM's own `Element` wherever both are in
 * scope, and `analyze.ts` needs both in the same file.
 */
export interface Published {
  /**
   * Each attribute the tag takes, with the values it allows where its type
   * is a union of string literals, and `null` where it takes any value.
   */
  attributes: Map<string, Set<string> | null>
  /** The family, from the module's path: `button` for `src/button/root/button-root.ts`. */
  family?: string | undefined
  hooks: Map<string, Set<string>>
  /**
   * The attributes the element writes on itself: one named for a read-only
   * member, as `helix-notifications` writes `unread`. Output, so never a
   * finding when the page shows it.
   */
  written: Set<string>
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
      const family = /^src\/([^/]+)\//.exec(module.path ?? '')?.[1]
      for (const declaration of module.declarations ?? []) {
        const tag = declaration.tagName
        if (!tag) {
          continue
        }
        let element = tags.get(tag)
        if (!element) {
          element = {
            attributes: new Map(),
            family,
            hooks: new Map(),
            parts: new Map(),
            written: new Set(),
          }
          tags.set(tag, element)
        }
        for (const member of declaration.members ?? []) {
          if (member.readonly && !member.static && member.kind === 'field') {
            element.written.add(member.name)
            element.written.add(
              member.name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
            )
          }
        }
        for (const attribute of declaration.attributes ?? []) {
          element.attributes.set(attribute.name, allowed(attribute.type?.text))
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
 * The values an attribute allows, where its type is nothing but string
 * literals, `undefined`, and `null`: `'ghost' | 'solid' | undefined` allows
 * `ghost` and `solid`. `null` for any other type, which takes any value.
 */
const allowed = (type: string | undefined): Set<string> | null => {
  if (!type) {
    return null
  }
  const literals = [...type.matchAll(/'([^']*)'/g)].map((match) => match[1] as string)
  const rest = type
    .replace(/'[^']*'/g, '')
    .replace(/\b(undefined|null)\b/g, '')
    .replace(/[|\s]/g, '')
  return literals.length > 0 && rest === '' ? new Set(literals) : null
}

/** The version each manifest describes, by package, where it says. */
export const versionsOf = (tiers: Tier[]): Record<string, string> => {
  const versions: Record<string, string> = {}
  for (const tier of tiers) {
    const version = tier.manifest.helix?.version
    if (version) {
      versions[tier.manifest.helix?.package ?? tier.name] = version
    }
  }
  return versions
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
export const nearest = (
  wrong: string,
  candidates: Iterable<string>,
  ceiling = Math.floor(wrong.length / 3),
): string | undefined => {
  let best: string | undefined
  let distance = Math.min(ceiling, Math.floor(wrong.length / 3))
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
    let least = row
    for (let column = 1; column <= to.length; column += 1) {
      const cell = Math.min(
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1,
        (previous[column - 1] ?? 0) + (from[row - 1] === to[column - 1] ? 0 : 1),
      )
      current[column] = cell
      least = Math.min(least, cell)
    }
    /* **Stopped the moment it cannot come back under**: the least cost in a
       row never falls in a later one, so a row past the ceiling decides it.
       Measured 4 Oct 2026 on the site's Data Table page, where every custom
       property that is no hook is compared with a thousand that are: the
       analysis went from about 500 milliseconds to about 45. */
    if (least > ceiling) {
      return undefined
    }
    previous = current
  }
  const total = previous[to.length]
  return total !== undefined && total <= ceiling ? total : undefined
}
