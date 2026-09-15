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
