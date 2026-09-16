import { render } from '@lit-labs/ssr'
import { collectResultSync } from '@lit-labs/ssr/lib/render-result.js'
import type { TemplateResult } from 'lit'

/** Renders a template the way the server does, to a string. */
export const ssr = (template: TemplateResult): string => collectResultSync(render(template))

/**
 * The same markup with the inlined stylesheet removed.
 *
 * Use this for every structural assertion. Declarative shadow DOM inlines the
 * component's CSS into the markup it is being asserted against, and that CSS
 * names every part, every host attribute, and every token the component uses.
 * So `toContain('part="media"')` passes on a selector, `toContain(
 * 'data-scrolled')` passes on a `:host([data-scrolled])` rule, and both say
 * nothing whatever about what rendered.
 *
 * Strip the styles first and the assertion can only see markup.
 */
export const withoutStyles = (markup: string): string =>
  markup.replace(/<style>[\s\S]*?<\/style>/g, '')

/**
 * Only the inlined stylesheets, for the assertion that is about them.
 *
 * The counterpart to `withoutStyles`, and the reason it exists is the same one:
 * a test asserting that declarative shadow DOM *carries* the sheet is asking
 * about the styles rather than about the markup, and it was reaching for the
 * whole document to do it. That reads identically to a structural assertion made
 * against the raw string, which is the fault every other helper here exists to
 * prevent, so the two could not be told apart by anything reading the test.
 *
 * Naming the subject separates them. `styles(markup)` cannot pass on a rendered
 * attribute, the way the whole document can, and it is the stronger assertion
 * besides: `toContain('--helix-color-surface')` on the whole document would be
 * satisfied by a host attribute of that name.
 */
export const styles = (markup: string): string =>
  [...markup.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((one) => one[1]).join('\n')

/**
 * The host element's opening tag, for asserting on its attributes.
 *
 * Reflected properties land here rather than in the shadow root, so a test
 * about what the host carries has to look at the host and not at the whole
 * document fragment.
 */
export const hostTag = (markup: string, tagName: string): string =>
  // The name has to end where the tag name ends. Tag names nest as prefixes
  // all over the set, so a bare `<${tagName}` matches `helix-toggle-group`
  // when asked for `helix-toggle` and reports the wrong element's attributes.
  new RegExp(`<${tagName}(?=[\\s>/])[^>]*>`).exec(withoutStyles(markup))?.[0] ?? ''

/**
 * Every attribute name on the host's opening tag, sorted.
 *
 * This is the hydration contract in one assertion. A React consumer's server
 * markup contains exactly the attributes they wrote in JSX, so any attribute a
 * component adds to its own host, whether by reflecting a default or by writing
 * `role` in `willUpdate`, is a mismatch the moment the element upgrades. React
 * reports it and does not patch it up.
 *
 * So the rule is that the host carries nothing the consumer did not write:
 * defaults are the absent attribute, semantics go through `ElementInternals`,
 * and measured geometry is written inside the shadow root.
 */
export const hostAttributes = (markup: string, tagName: string): string[] =>
  // Values are stripped first. A word inside one is not an attribute, so
  // `label="Choose a date"` otherwise reports an attribute named `a`.
  [
    ...hostTag(markup, tagName)
      .replace(/=\s*"[^"]*"/g, '=')
      .replace(/=\s*'[^']*'/g, '=')
      .matchAll(/\s([a-z-]+[a-z0-9-]*)(?==|[\s>/])/g),
  ]
    .map(([, name]) => name as string)
    .sort()

/**
 * Whether the shadow root contains an element rendered with the given part.
 *
 * Matches the tag rather than the bare `part="…"` string, so a selector in the
 * stylesheet cannot satisfy it.
 */
export const hasPart = (markup: string, name: string): boolean => partTag(markup, name) !== ''

/**
 * The opening tag of the element carrying the given part.
 *
 * Attribute bindings render across several lines and `part` is rarely the first
 * attribute, so this spans both rather than assuming the tag is flat or that
 * `part` leads. Use it to assert on what a region actually carries, as distinct
 * from what the consumer wrote on the host.
 */
export const partTag = (markup: string, name: string): string =>
  new RegExp(`<[a-z-]+\\s[^>]*part="(?:[^"]* )?${name}(?: [^"]*)?"[^>]*>`).exec(
    withoutStyles(markup),
  )?.[0] ?? ''

/**
 * Every part the shadow root rendered, each named once and sorted.
 *
 * **The whole list rather than a search for one name.** `hasPart` and its
 * negation answer about a part somebody thought of; this answers about the
 * render, so a part added to a template nobody meant to change fails here
 * instead of going unmentioned. It is the shape `hostAttributes` already has,
 * and for the same reason.
 *
 * What it is for is the served frame of a component that cannot be served
 * whole: a chart resolving `for` against a document has none to resolve on a
 * server, so what it owes is its box and nothing drawn in it, and "nothing
 * drawn" is a claim about everything rather than about the marks a spec author
 * remembered to name.
 *
 * `\spart=` rather than `part=`, so `exportparts="arrow: tooltip-arrow, …"` is
 * not read as a part list: it names parts a component forwards and not ones it
 * rendered, and every chart here carries one.
 */
export const servedParts = (markup: string): string[] =>
  [
    ...new Set(
      [...withoutStyles(markup).matchAll(/\spart="([^"]*)"/g)].flatMap(([, names]) =>
        (names as string).split(/\s+/).filter((one) => one !== ''),
      ),
    ),
  ].sort()

/**
 * Only what the component rendered: the inlined sheet and the host's own tag
 * gone.
 *
 * **`withoutStyles` is not enough on its own, and the gap is the same shape the
 * sheet was.** What it leaves behind still opens with the host tag, which is the
 * consumer's own markup echoed back, so a substring assertion can pass on an
 * attribute nobody rendered. Measured on the cohort: `<helix-date-input
 * value="2026-08-18">` renders `August 18, 2026` into its field, by design, and
 * a spec claiming "the date is already in the field" passed against the whole
 * document for six weeks because `value="2026-08-18"` was sitting in the host
 * tag two characters away. Time Input and Color Input had the same test.
 *
 * So the rule is that an assertion about what a component *rendered* comes
 * through here or through `partTag`, and one about what the *consumer* wrote
 * comes through `hostTag` or `hostAttributes`.
 *
 * The host's children are left, being neither: a slotted node is the consumer's
 * markup and is also what the component chose to project, so a spec asserting on
 * one should say which it means by reaching for the part that holds it.
 */
export const rendered = (markup: string, tagName: string): string => {
  const shadow = withoutStyles(markup)
  const host = hostTag(markup, tagName)
  return host === '' ? shadow : shadow.replace(host, '')
}

/**
 * Whether the served markup names its own control, through a `<label for>` that
 * resolves.
 *
 * **The question a field's server output has to answer and the one no substring
 * can.** `toContain('for="control"')` and `toContain('id="control"')` are two
 * literals that pass side by side whether or not they are the same element's,
 * and a `for` naming an id nothing renders is a field a screen reader announces
 * as "edit text": valid markup, no error anywhere, no name. So this reads the
 * `for` off the rendered label and asks whether that id is in the same shadow
 * root, which is the only tree an IDREF resolves in.
 *
 * False where a field names itself through `ElementInternals` instead, which is
 * what a group does and is correct: no server writes internals, so a group's
 * markup carries no name and a spec should say so rather than assert one.
 */
export const namesControl = (markup: string): boolean => {
  const shadow = withoutStyles(markup)
  const named = /<label[^>]*\sfor="([^"]+)"/.exec(shadow)?.[1]
  return named !== undefined && new RegExp(`<[a-z-]+\\s[^>]*id="${named}"`).test(shadow)
}
