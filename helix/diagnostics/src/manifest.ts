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
      /**
       * Helix's own fields: `interactive`, the native control the element
       * draws its content inside, from `@interactive`, and `family`, the family
       * an element joins from another package, from `@family`.
       */
      helix?: { family?: string; interactive?: string }
      members?: Array<{
        attribute?: string
        /** How the attribute turns a boolean property on, where it is one. */
        helix?: { boolean?: string }
        kind?: string
        name: string
        readonly?: boolean
        reflects?: boolean
        static?: boolean
      }>
      cssParts?: Array<{ name: string }>
      cssProperties?: Array<{ name: string }>
      slots?: Array<{ name: string }>
      tagName?: string
    }>
  }>
}

/**
 * What diagnostics reads of one package's manifest, and nothing else: per
 * tag, the parts, the hooks, the slots, the attributes with the values each
 * allows, the attributes the element writes on itself, and the family.
 *
 * **About a seventieth of the manifest.** Measured 4 Oct 2026: 124 KB for the
 * styled tier and 103 KB for the headless one, 18 KB and 14 KB compressed,
 * against manifests of 8.6 MB and 7.0 MB. `analyze` writes it beside each
 * `custom-elements.json` as `lint.json`, and every Helix package publishes
 * it, so a page can load the data for exactly the version it runs.
 */
export interface LintData {
  /** The package the data describes. */
  package: string
  tags: Record<string, LintTag>
  /** The package's version, where the manifest says. */
  version?: string | undefined
}

/** What one tag publishes, as lint data says it. */
export interface LintTag {
  /** Each attribute, with the values it allows, or `null` where it takes any. */
  attributes: Record<string, string[] | null>
  /**
   * The attributes that are on wherever they are present, `"false"`
   * included: each turns on a boolean property Lit reads with
   * `type: Boolean`. Absent from lint data written before this field, which a
   * reader takes as unknown.
   */
  booleans?: string[]
  /** The family, from `@family` or else from the module's path. */
  family?: string | undefined
  hooks: string[]
  /**
   * What a person presses or types in, where the element is one: `button` or
   * `link` for an element that draws its content inside its own native button
   * or link, and `control` for any other form control. Absent where the
   * element is neither. **Typed as any `string`**: a page passes the
   * `lint.json` it imports, and TypeScript reads every string in an imported
   * JSON file as `string`, so the {@link Interactive} union here refused every
   * page's `{ lint }`. `index` keeps only the kinds it knows.
   */
  interactive?: string
  parts: string[]
  /**
   * The slots the element has, by name, the default one as `""`. Absent from
   * lint data written before 0.165, which a reader takes as unknown.
   */
  slots?: string[]
  /**
   * The attributes a property writes back to the element when it is set, so a
   * selector on one matches however the property was set. Absent from lint data
   * written before this field, which a reader takes as unknown.
   */
  reflected?: string[]
  /** The attributes the element writes on itself: one named for a read-only member. */
  written: string[]
}

/**
 * What a person presses or types in: an element drawn inside a native
 * `button` or `link`, which HTML allows no interactive element inside, or
 * another form `control`.
 */
export type Interactive = 'button' | 'control' | 'link'

/** Whether lint data names a kind this reader knows. */
const isInteractive = (kind: string | undefined): kind is Interactive =>
  kind === 'button' || kind === 'control' || kind === 'link'

/**
 * One installed tier: its manifest, with the package name, or its lint data,
 * which names the package itself.
 */
export type Tier =
  | {
      manifest: ManifestSource
      /** Package name, used verbatim in a finding's message. */
      name: string
    }
  | { lint: LintData }

/** The lint data for a manifest: what `analyze` writes, and what `index` reads. */
export const lintOf = (manifest: ManifestSource, name: string): LintData => {
  const tags: Record<string, LintTag> = {}
  for (const module of manifest.modules ?? []) {
    const folder = /^src\/([^/]+)\//.exec(module.path ?? '')?.[1]
    for (const declaration of module.declarations ?? []) {
      const tag = declaration.tagName
      if (!tag) {
        continue
      }
      const entry: LintTag = tags[tag] ?? {
        attributes: {},
        booleans: [],
        family: declaration.helix?.family ?? folder,
        hooks: [],
        parts: [],
        reflected: [],
        slots: [],
        written: [],
      }
      tags[tag] = entry
      /* **A form control is told by the `form` every one carries**, as the
         scan tells one from the catalog: `formAssociated` is static. */
      const drawn = declaration.helix?.interactive
      if (drawn === 'button' || drawn === 'link') {
        entry.interactive = drawn
      } else if (
        (declaration.members ?? []).some(
          (member) => member.name === 'form' && member.kind === 'field' && !member.static,
        )
      ) {
        entry.interactive = 'control'
      }
      for (const member of declaration.members ?? []) {
        if (member.reflects && member.attribute) {
          entry.reflected?.push(member.attribute)
        }
        if (member.attribute && member.helix?.boolean === 'present') {
          entry.booleans?.push(member.attribute)
        }
        if (member.readonly && !member.static && member.kind === 'field') {
          entry.written.push(
            member.name,
            member.name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
          )
        }
      }
      for (const attribute of declaration.attributes ?? []) {
        const values = allowed(attribute.type?.text)
        entry.attributes[attribute.name] = values ? [...values] : null
      }
      entry.parts.push(...(declaration.cssParts ?? []).map((part) => part.name))
      entry.hooks.push(...(declaration.cssProperties ?? []).map((hook) => hook.name))
      entry.slots?.push(...(declaration.slots ?? []).map((slot) => slot.name))
    }
  }
  for (const entry of Object.values(tags)) {
    entry.written = [...new Set(entry.written)]
    entry.parts = [...new Set(entry.parts)]
    entry.hooks = [...new Set(entry.hooks)]
    entry.slots = [...new Set(entry.slots)]
    entry.reflected = [...new Set(entry.reflected)]
    entry.booleans = [...new Set(entry.booleans)]
  }
  return {
    package: manifest.helix?.package ?? name,
    tags,
    ...(manifest.helix?.version ? { version: manifest.helix.version } : {}),
  }
}

/** A tier's lint data, read from its lint data or derived from its manifest. */
export const lintFor = (tier: Tier): LintData =>
  'lint' in tier ? tier.lint : lintOf(tier.manifest, tier.name)

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
  /**
   * The attributes that are on wherever they are present, `"false"`
   * included. Absent where a tier's lint data predates the field, which says
   * nothing either way.
   */
  booleans?: Set<string> | undefined
  /** The family, from the module's path: `button` for `src/button/root/button-root.ts`. */
  family?: string | undefined
  hooks: Map<string, Set<string>>
  /** What a person presses or types in, where the element is one. */
  interactive?: Interactive | undefined
  /**
   * The attributes a property writes back when it is set. Absent where a tier's
   * lint data predates the field, which says nothing either way.
   */
  reflected?: Set<string> | undefined
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
    const lint = lintFor(tier)
    for (const [tag, entry] of Object.entries(lint.tags)) {
      let element = tags.get(tag)
      if (!element) {
        element = {
          attributes: new Map(),
          family: entry.family,
          hooks: new Map(),
          parts: new Map(),
          written: new Set(),
        }
        tags.set(tag, element)
      }
      for (const name of entry.written) {
        element.written.add(name)
      }
      if (isInteractive(entry.interactive)) {
        element.interactive ??= entry.interactive
      }
      if (entry.booleans) {
        element.booleans ??= new Set()
        for (const name of entry.booleans) {
          element.booleans.add(name)
        }
      }
      if (entry.reflected) {
        element.reflected ??= new Set()
        for (const name of entry.reflected) {
          element.reflected.add(name)
        }
      }
      for (const [name, values] of Object.entries(entry.attributes)) {
        element.attributes.set(name, values ? new Set(values) : null)
      }
      for (const [names, into] of [
        [entry.parts, element.parts],
        [entry.hooks, element.hooks],
      ] as const) {
        for (const name of names) {
          const publishers = into.get(name) ?? new Set<string>()
          publishers.add(lint.package)
          into.set(name, publishers)
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
    const lint = lintFor(tier)
    if (lint.version) {
      versions[lint.package] = lint.version
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
 * told that `--breadcrumbs-hover-background-color` exists, they are done.
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
