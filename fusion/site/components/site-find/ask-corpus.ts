/**
 * The facts Ask ranks, built on the server.
 *
 * The catalog and the docs registry stay here. What crosses to the palette is
 * the slim list: a name, a line, a URL, and the words to match. Importing this
 * from a client component would pull the catalog into the browser.
 */

import { getFamilies } from '@/content/catalog/catalog'
import { HERO } from '@/content/landing/helix-landing'
import { routes } from '@/content/routes/routes'
import type { AskFact, AskKind } from './ask'

/**
 * Sentences copied from published pages.
 *
 * `intent-reference.mdx` states the contrast target. `tools.ts` states the
 * three results in the theme builder's contrast column. The install line is
 * `HERO.install`, the same command the homepage shows.
 */
const CONTRAST_TARGET =
  'Target contrast for body text. 4.5 is WCAG AA, and 7 is AAA. The default is 4.5.'
const CONTRAST_RESULTS =
  'Met: the pair meets its contrast target. Unverifiable: the background is translucent. Pinned: you set the color yourself.'
const SCAFFOLD = 'npm create @fusion.dev/helix-app@latest'

/** The docs index, the component index, the sandbox, and the theme builder. */
const PAGES = new Set(['/helix/components', '/helix/docs', '/helix/sandbox', '/helix/theme'])

/**
 * Every fact Ask may offer, in the order a tie keeps.
 *
 * Static facts first, then docs routes, then components. The ranker breaks a
 * tie by this order, so a named install row stays ahead of a doc that only
 * mentions installing.
 */
export const askCorpus = (): AskFact[] => {
  const docs: AskFact[] = []
  for (const route of routes()) {
    if (route.kind === 'component') {
      continue
    }
    if (route.kind !== 'doc' && !PAGES.has(route.path)) {
      continue
    }
    docs.push({
      detail: route.description,
      href: route.path,
      id: `doc:${route.path}`,
      kind: 'doc',
      label: route.title,
      terms: `${route.title} ${route.description} ${route.section} ${route.path}`,
    })
  }

  const components: AskFact[] = getFamilies().map((family) => {
    const tags = family.elements.map((element) => element.tagName)
    const root = family.elements.find(
      (element) => element.tier === 'styled' && element.part === 'Root',
    )
    const mark = root?.tagName
    return {
      detail: family.summary || mark || family.label,
      href: `/helix/components/${family.slug}`,
      id: `component:${family.slug}`,
      kind: 'component' as const,
      label: family.label,
      ...(mark === undefined ? {} : { mark }),
      sandbox: `/helix/sandbox?e=${family.slug}`,
      terms: [
        family.label,
        family.slug,
        family.summary,
        family.category,
        ...family.aliases,
        ...tags,
      ]
        .filter((word) => word !== '')
        .join(' '),
    }
  })

  return [...stated(), ...docs, ...components]
}

/** The install command, the manifest URLs, and the contrast figures. */
const stated = (): AskFact[] => [
  fact({
    detail: HERO.install,
    href: '/helix/docs/installation',
    id: 'install',
    kind: 'install',
    label: 'Install Helix',
    terms: `install installation bun add npm package ${HERO.install}`,
  }),
  fact({
    detail: SCAFFOLD,
    href: '/helix/docs/installation',
    id: 'scaffold',
    kind: 'install',
    label: 'Start a project',
    terms: `scaffold create project template app ${SCAFFOLD}`,
  }),
  fact({
    detail: 'Every tag @fusion.dev/helix ships.',
    href: '/helix/custom-elements.json',
    id: 'manifest',
    kind: 'manifest',
    label: 'Custom elements manifest',
    terms: 'manifest cem custom-elements.json custom elements tag tags api',
  }),
  fact({
    detail: 'Families, tags, properties, and events.',
    href: '/helix/api.json',
    id: 'catalog',
    kind: 'manifest',
    label: 'Component catalog',
    terms: 'catalog api.json families tags properties events manifest',
  }),
  fact({
    detail: 'The semantic tokens, with their values.',
    href: '/helix/tokens.json',
    id: 'tokens',
    kind: 'manifest',
    label: 'Token file',
    terms: 'tokens token file semantic values tokens.json',
  }),
  fact({
    detail: CONTRAST_TARGET,
    href: '/helix/docs/intent-reference',
    id: 'contrast-target',
    kind: 'contrast',
    label: 'Contrast target',
    terms: 'contrast target wcag aa aaa grade 4.5 7 theme text',
  }),
  fact({
    detail: CONTRAST_RESULTS,
    href: '/helix/theme',
    id: 'contrast-results',
    kind: 'contrast',
    label: 'Contrast results',
    terms: 'contrast met unverifiable pinned result column grade pair theme builder',
  }),
]

/** Checks the kind at the single place a fact is written. */
const fact = (one: {
  detail: string
  href: string
  id: string
  kind: AskKind
  label: string
  terms: string
}): AskFact => one
