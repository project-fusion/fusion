/** The gallery's screens, and what each one is opened with. */
export type Routes = {
  /**
   * One of the checks the device runs make that no example shows, as
   * `helix://checks/<name>` opens it.
   */
  Checks: { check: string }
  /**
   * One example, with Preview and Code tabs, or its preview alone where
   * `alone` is set, as `helix://<family>/<example>/preview` opens it.
   */
  Example: { alone?: boolean; example: string; family: string }
  /** One family's examples. */
  Family: { family: string }
  /**
   * The proof app: a project dashboard on Expo Router, written once for the
   * web and a phone, open at the route `path` names, as
   * `helix://proof/projects/website/activity` opens it at
   * `/projects/website/activity`.
   */
  Proof: { path?: string } | undefined
  /** The families, and the settings. */
  Home: undefined
  /** A list of 1,000 rows, and the frame rate it scrolls at. */
  Rows: undefined
}
