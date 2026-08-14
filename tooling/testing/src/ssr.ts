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
 * The host element's opening tag, for asserting on its attributes.
 *
 * Reflected properties land here rather than in the shadow root, so a test
 * about what the host carries has to look at the host and not at the whole
 * document fragment.
 */
export const hostTag = (markup: string, tagName: string): string =>
  new RegExp(`<${tagName}[^>]*>`).exec(withoutStyles(markup))?.[0] ?? ''

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
  [...hostTag(markup, tagName).matchAll(/\s([a-z-]+[a-z0-9-]*)(?==|[\s>/])/g)]
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
  new RegExp(`<[a-z-]+\\s[^>]*part="${name}"[^>]*>`).exec(withoutStyles(markup))?.[0] ?? ''
