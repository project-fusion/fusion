/**
 * The DOM specs known to fail in WebKit, each with what was measured.
 *
 * `run-browser-specs.mjs --browser webkit` reports each one on every run and
 * does not fail on it, and it fails on one that passes or no longer exists, so
 * an entry leaves this list the day its cause is fixed. A spec that only
 * assumed Chromium is fixed in the spec and never listed here. What is here is
 * a difference in Helix's behavior in WebKit that the owner has still to
 * decide on.
 *
 * Keyed by the line the runner prints for a failure: the family, the suite,
 * and the spec's own name. Measured on WebKit 26.6, through Playwright 1.63,
 * on October 10 and 11, 2026.
 *
 * **An entry is its cause, or the cause with two qualifiers.** `only` names the
 * one `process.platform` it fails on, because WebKit is a different build on
 * macOS and on Linux, and CI runs Linux's. `sometimes` marks a failure that
 * depends on how fast the machine is, so a pass is not news.
 */

/**
 * Helix names a host through `ElementInternals`, pointing into its own shadow
 * root, because an IDREF cannot cross the boundary.
 */
const REFERENCE =
  'WebKit takes an element reference that `ElementInternals` points into the ' +
  "host's own shadow root and reads it back as `[]`. Whether VoiceOver still " +
  'reads the name or the description it carries needs a check in Safari.'

export const KNOWN_IN_WEBKIT = {
  'checkbox-group > checkbox group as a field > the group is named and described by its own nodes':
    REFERENCE,
  'option > a group of options > and names the run by its heading where that is the only heading there is':
    REFERENCE,
  'option > a group of options > takes a slotted label over the string': REFERENCE,
  'option > what an option is called > is its label alone, and its caption is its description':
    REFERENCE,
  'option > what an option is called > says its second destination beside a caption': REFERENCE,
  'radio > radio group as a field > the question is named and described on the host': REFERENCE,
  'toast > what a message is to a screen reader > named by its words, where it has no heading':
    REFERENCE,
  'tooltip > tooltip > a tooltip with only slotted content shows, and is linked': REFERENCE,
  'tooltip > tooltip > the description is linked by element, not by id': REFERENCE,
}
