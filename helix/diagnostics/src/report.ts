/**
 * What a diagnostic run returns, and why coverage is not a field beside the
 * findings.
 *
 * **A bare pass is a lie this collector is structurally capable of telling.**
 * Cross-origin stylesheets throw on `.cssRules`, and a run that could not read
 * half its input reports the same empty array as a run that read all of it.
 * `check:dialect` shipped in exactly that condition for weeks: green, and
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
   * file is not in the object model at any level. `24-diagnostics.md` asks for a
   * line, and this is the honest substitute: the text of the rule is what a
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
  kind: 'dead-hook' | 'dead-part' | 'duplicate-registration' | 'unforwarded-part' | 'unknown-tag'
  /** One sentence, addressed to whoever wrote the CSS. */
  message: string
  /** Where it was read. Absent only for faults that are not in a stylesheet. */
  origin?: Origin
  /** The selector the fault sits in, or the tag for a runtime fault. */
  subject: string
}

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

/** The whole result. Coverage and findings, never one without the other. */
export interface Report {
  coverage: Coverage
  findings: Finding[]
}
