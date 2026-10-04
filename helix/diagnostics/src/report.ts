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
   * What the collector believes the author meant, when it can tell.
   *
   * `| undefined` rather than the bare optional, because
   * `exactOptionalPropertyTypes` is on and `nearest()` returns `undefined` when
   * nothing is close enough to suggest. Writing the key as absent-or-string and
   * then assigning `undefined` to it is the exact thing that setting exists to
   * catch.
   */
  expected?: string | undefined
  /** Machine-readable fault class, stable across versions. */
  kind: Kind
  /** One sentence, addressed to whoever wrote the CSS. */
  message: string
  /** Where it was read. Absent only for faults that are not in a stylesheet. */
  origin?: Origin
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
  'manifest-skew',
  'unforwarded-part',
  'unknown-tag',
] as const

/** A fault class. */
export type Kind = (typeof KINDS)[number]

/** How serious a finding is. */
export type Severity = 'error' | 'info' | 'warn'

/** Where a finding's severity was decided. */
export type Layer = 'argument' | 'file' | 'shipped'

/** A finding before the rules have given it a severity. */
export type Raw = Omit<Finding, 'decidedBy' | 'severity'>

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

/** The whole result. Coverage and findings, never one without the other. */
export interface Report {
  coverage: Coverage
  findings: Finding[]
  /**
   * How many findings each override layer turned off. A finding turned off
   * is still a fault, and a report that hid the count would read as cleaner
   * than the page is.
   */
  silenced: { argument: number; file: number }
  usage: Usage
}
