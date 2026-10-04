/**
 * What a diagnostic run returns, and why coverage is not a field beside the
 * findings.
 *
 * **A bare pass is a lie this collector is structurally capable of telling.**
 * Cross-origin stylesheets throw on `.cssRules`, and a run that could not read
 * half its input reports the same empty array as a run that read all of it.
 * `fusion prose`'s `dialect` shipped in exactly that condition for weeks: green, and
 * incapable of being anything else. So `Report` has no `findings` that can be
 * destructured away from the `coverage` that qualifies them, and the console
 * sink prints coverage first whether or not anything was found.
 */

/** Where a rule was read from, so a reader can go and look at it. */
export interface Origin {
  /**
   * The rule's own text, which is the receipt.
   *
   * **There is no line number and there cannot be one.** CSSOM exposes
   * `cssText` and an index within the sheet; the byte offset in the authored
   * file is not in the object model at any level. A line was asked for, and
   * this is the honest substitute: the text of the rule is what a
   * reader searches for, and it survives minification and bundling in a way a
   * line number would not.
   */
  cssText: string
  /** Position within the sheet's own rule list, for a sheet with repeats. */
  index: number
  /** The sheet's `href`, or a description of why it has none. */
  sheet: string
}

/**
 * One thing that is wrong, with everything needed to disagree with it.
 *
 * **No finding without a receipt.** A rules engine makes a wrong finding cheap
 * to add, and a check that cries wolf trains its only reader to ignore it. The
 * `origin` and `expected` fields are what let a reader settle it in five
 * seconds, and a finding that cannot produce them is a bug in the collector
 * rather than a finding.
 */
export interface Finding {
  /**
   * What the fault is about: `styling` for parts and hooks, `markup` for
   * attributes and slots, `integrity` for the page and the library
   * disagreeing, `guideline` for advice. A dashboard groups by it.
   */
  category: FindingCategory
  /**
   * What the collector believes the author meant, when it can tell.
   *
   * `| undefined` rather than the bare optional, because
   * `exactOptionalPropertyTypes` is on and `nearest()` returns `undefined` when
   * nothing is close enough to suggest. Writing the key as absent-or-string and
   * then assigning `undefined` to it is the exact thing that setting exists to
   * catch.
   */
  expected?: string | undefined
  /** The family the tag belongs to, from the manifest's module path. */
  family?: string | undefined
  /**
   * The finding's identity across runs: the same fault in the next run has
   * the same fingerprint, which is what makes fixed and regressed computable.
   * See `fingerprintOf`.
   */
  fingerprint: string
  /** Machine-readable fault class, stable across versions. */
  kind: Kind
  /** One sentence, addressed to whoever wrote the CSS. */
  message: string
  /** Where it was read. Absent only for faults that are not in a stylesheet. */
  origin?: Origin
  /**
   * Who fixes it: `consumer`, the page's authors, or `helix`, the library,
   * as for a part the styled tier never forwarded.
   */
  owner: Owner
  /** How serious it is, after the shipped rules and any overrides. */
  severity: Severity
  /**
   * Which layer set `severity`: the rules this package ships, the project's
   * file, or the argument to `diagnose`. With two layers able to override,
   * a severity alone cannot say where it came from.
   */
  decidedBy: Layer
  /** The selector the fault sits in, or the tag for a runtime fault. */
  subject: string
  /** The Helix tag the finding is about, which a scoped override matches on. */
  tag: string
}

/** Every fault class, stable across versions. */
export const KINDS = [
  'dead-hook',
  'dead-part',
  'duplicate-registration',
  'invalid-value',
  'manifest-skew',
  'unforwarded-part',
  'unknown-attribute',
  'unknown-tag',
] as const

/** A fault class. */
export type Kind = (typeof KINDS)[number]

/** How serious a finding is. */
export type Severity = 'error' | 'info' | 'warn'

/** Where a finding's severity was decided. */
export type Layer = 'argument' | 'file' | 'shipped'

/** What a fault is about. */
export type FindingCategory = 'guideline' | 'integrity' | 'markup' | 'styling'

/** Who fixes a fault. */
export type Owner = 'consumer' | 'helix'

/** A finding as a check first writes it. */
export type Raw = Omit<
  Finding,
  'category' | 'decidedBy' | 'family' | 'fingerprint' | 'owner' | 'severity'
>

/** A finding with its identity, before the rules have given it a severity. */
export type Identified = Omit<Finding, 'decidedBy' | 'severity'>

/**
 * The kinds of telemetry a run can hold, each its own shape. A project turns
 * each on or off for sending; see `Config.send`.
 */
export const CATEGORIES = [
  'assist',
  'configuration',
  'coverage',
  'findings',
  'performance',
  'runtime',
  'usage',
] as const

/** A kind of telemetry. */
export type Category = (typeof CATEGORIES)[number]

/** Where a run was declared to happen. Undeclared is never sent. */
export type Environment = 'ci' | 'development' | 'production'

/** A sheet the collector could not read, and the reason. */
export interface Unreadable {
  reason: 'cross-origin' | 'detached' | 'threw'
  sheet: string
}

/**
 * How much of the page the run actually saw.
 *
 * `roots` counts shadow roots traversed rather than elements visited, because
 * that is the number that moves when a component hides its styles: Helix roots
 * are all open (Lit's default, and nothing in the library overrides `mode`), so
 * their adopted stylesheets are readable, and a third-party closed root is a
 * hole this reports rather than steps over.
 */
export interface Coverage {
  /** Sheets whose rules were read end to end. */
  read: number
  /** Shadow roots entered, including nested ones. */
  roots: number
  /** Sheets found, readable or not. */
  sheets: number
  /** Every sheet that could not be read, with its reason. */
  unreadable: Unreadable[]
}

/**
 * What a page uses of Helix, counted by tag.
 *
 * Plain objects of counts, so a sink can write the report as JSON and read it
 * back unchanged.
 */
export interface Usage {
  /**
   * Each axis set, by tag, axis, and value: `emphasis`, `material`,
   * `separation`, and `tone`. An axis left unset is not counted.
   */
  axes: Record<string, Record<string, Record<string, number>>>
  /**
   * The Helix elements other Helix elements render inside their own shadow
   * roots, such as the select a pagination size draws. Kept apart from
   * `tags`, which counts what the page put there.
   */
  composed: Record<string, number>
  /**
   * How the elements were counted. `watched`: every element that rendered
   * since `watch()` began, including the ones that have gone, such as a
   * closed dialog. `walked`: the elements in the page at the moment of the
   * run, which misses those.
   */
  counted: 'walked' | 'watched'
  /** Each hook the page's stylesheets set, by tag, counted per declaration. */
  hooks: Record<string, Record<string, number>>
  /**
   * The values each hook is set to, by tag, hook, and value, where the
   * project allows it (`detail.hookValues`). A hook set to one value across
   * projects is a token Helix should have shipped. Values over 200
   * characters are cut there.
   */
  hookValues: Record<string, Record<string, Record<string, number>>>
  /** Each part the page's stylesheets style, by tag, counted per rule. */
  parts: Record<string, Record<string, number>>
  /** Each named slot filled, by tag. */
  slots: Record<string, Record<string, number>>
  /** Each Helix element the page put there, by tag. */
  tags: Record<string, number>
  /**
   * Elements named `helix-*` that no manifest passed in lists, by tag: a
   * page's own element under the prefix, or a family whose manifest was not
   * passed. Kept out of the other counts, which are Helix's.
   */
  unlisted: Record<string, number>
}

/** The settings a run was made under, and what they turned off. */
export interface Configuration {
  /** The lowest level each category prints at in the console, or `off`. */
  console: {
    coverage: 'info' | 'off'
    findings: Severity | 'off'
    usage: 'debug' | 'off'
  }
  /** How much detail goes with what is sent. */
  detail: {
    evidence: 'full' | 'none' | 'selector'
    hookValues: boolean
    pages: 'full' | 'none' | 'patterns'
  }
  /** Where sending happens, and production's sample rate. */
  environments: {
    ci: boolean
    development: boolean
    production: false | { sample: number }
  }
  /** Where `initDiagnostics()` hands each run, beside the console. */
  sinks: {
    /** The overlay on the page. */
    overlay: boolean
    /** The relay, `helix diagnostics`: off, on at its own address, or at this one. */
    relay: boolean | string
  }
  /** Each override in effect, from the file or the call. */
  overrides: Array<{
    kind: Kind
    layer: Exclude<Layer, 'shipped'>
    severity: Severity | 'off'
    tags?: string[]
  }>
  /**
   * How many findings each override turned off, by kind and layer. A finding
   * turned off is still a fault, and a report that hid the count would read
   * as cleaner than the page is.
   */
  silenced: Array<{ count: number; kind: Kind; layer: Exclude<Layer, 'shipped'> }>
}

/**
 * One run: what was found, what is used, how much could be seen, and the
 * settings it was made under, with everything a dashboard needs to place it.
 *
 * **The same shape from every source and to every sink**, versioned by
 * `schema`, so a run written by CI today is read by the dashboard next year.
 */
export interface Report {
  /** The shape's version. Raised when a field changes meaning or goes. */
  schema: 1
  configuration: Configuration
  coverage: Coverage
  findings: Finding[]
  /**
   * The project's own name and labels, as its configuration gives them. The
   * key is never written into a report.
   */
  project: { name?: string; tags: string[] }
  run: {
    /** When the run began, as an ISO 8601 time. */
    at: string
    /** How long the run took, in milliseconds. */
    duration: number
    /** Where it was declared to run. Absent where nobody declared it. */
    environment?: Environment
    /** A new identity per run, so a run sent twice is stored once. */
    id: string
    /** The page, as `detail.pages` allows: a pattern, a path, or absent. */
    page?: string
    /** Where the run was made: in the page, or from the code. */
    source: 'code' | 'page'
  }
  usage: Usage
  versions: {
    /** This package's version, which collected the run. */
    collector: string
    /** The Helix versions loaded on the page, one per copy of core: two means two copies. */
    helix: string[]
    /** The version each manifest passed in describes, by package. */
    manifests: Record<string, string>
    /** The shipped rules' version, which is the collector's. */
    rules: string
  }
  /**
   * The categories the project turned off for sending, and which place
   * turned each off, so an empty category reads as withheld and never as
   * nothing there.
   */
  withheld: Array<{ category: Category; decidedBy: Layer }>
}
