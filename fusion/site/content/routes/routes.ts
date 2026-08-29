import { pages as docPages, navigation } from '@fusion.dev/helix-docs'
import { findSitePage } from '@fusion.dev/insights'
import { LANDING } from '@/content/landing/landing'
import { getFamilies } from '../catalog/catalog'
import { INSIGHTS } from '../insights'

/*
 * Every page this site serves, in one module.
 *
 * **Nothing else enumerates routes.** The sitemap, `llms.txt` and the markdown
 * generator all read this, which is what makes `turbo run routes -- --check`
 * possible, and `turbo run routes -- --check` is what stops the markdown surface decaying into
 * a stale parallel site. That decay is the failure mode of every
 * documentation-for-models project that keeps two lists.
 *
 * **A route says how to get its document rather than holding one.** The three
 * kinds of page here have three different sources: a component page comes from
 * the manifest, a docs page from MDX in `@fusion.dev/helix-docs`, and a prose page from
 * a module in this app. Holding the text here would be a fourth copy of all
 * three and the one that goes stale.
 */

/** Where a route's markdown comes from, and what kind of page it is. */
export type RouteKind = 'component' | 'doc' | 'insight' | 'page'

export interface Route {
  /** One-line summary, for `llms.txt` and for a search result. */
  description: string
  kind: RouteKind
  /** Path as served, with a leading slash and no extension. */
  path: string
  /**
   * Relative importance, for the sitemap.
   *
   * 1 is the landing page and 0.3 the legal pages: what a reader came for
   * ranks above what the site is obliged to serve.
   */
  priority: number
  /** Grouping in `llms.txt`. */
  section: string
  title: string
}

/**
 * Prose pages, whose text lives in this app.
 *
 * Written out rather than discovered from the filesystem, because a route is a
 * promise and a file is not: a `page.tsx` under a route group that nothing
 * links to should not appear in a sitemap because it happens to exist.
 */
const PROSE: Route[] = [
  {
    /* The one route whose words are not written here. The landing page's copy
       module is the source for its title and its lede, and a second wording in
       this file would be exactly the drift the module exists to remove. The
       site's own name stays the title, because that is what a sitemap and a
       search result want and the page's headline is not it. */
    description: LANDING.lede,
    kind: 'page',
    path: '/',
    priority: 1,
    section: 'Fusion',
    title: 'Fusion Development Group',
  },
  {
    description: findSitePage('/thesis')?.description ?? '',
    kind: 'page',
    path: '/thesis',
    priority: 0.8,
    section: 'Fusion',
    title: 'Thesis',
  },
  {
    description: findSitePage('/trust')?.description ?? '',
    kind: 'page',
    path: '/trust',
    priority: 0.8,
    section: 'Fusion',
    title: 'Trust',
  },
  {
    description: 'What we take on, and what it costs.',
    kind: 'page',
    path: '/services',
    priority: 0.7,
    section: 'Fusion',
    title: 'Services',
  },
  {
    description: 'How to reach us.',
    kind: 'page',
    path: '/contact',
    priority: 0.5,
    section: 'Fusion',
    title: 'Contact',
  },
  /* The two legal pages, at a lower priority than anything a reader came for.
     Listed rather than omitted because `turbo run routes -- --check` holds every address the
     site serves, and an unlisted page is one a sitemap never names and nothing
     notices going missing. */
  {
    description: findSitePage('/terms')?.description ?? '',
    kind: 'page',
    path: '/terms',
    priority: 0.3,
    section: 'Fusion',
    title: 'Terms of use',
  },
  {
    description: findSitePage('/privacy')?.description ?? '',
    kind: 'page',
    path: '/privacy',
    priority: 0.3,
    section: 'Fusion',
    title: 'Privacy',
  },
  {
    description: findSitePage('/acceptable-use')?.description ?? '',
    kind: 'page',
    path: '/acceptable-use',
    priority: 0.3,
    section: 'Fusion',
    title: 'Acceptable use',
  },
  {
    description: 'The design system: tokens, two component tiers, and a theme engine.',
    kind: 'page',
    path: '/helix',
    priority: 0.9,
    section: 'Helix',
    title: 'Helix',
  },
  {
    description: 'Install it, theme it, and the ideas underneath.',
    kind: 'page',
    path: '/helix/docs',
    priority: 0.9,
    section: 'Helix',
    title: 'Docs',
  },
  {
    description: 'Every family Helix ships, with its API and a live example.',
    kind: 'page',
    path: '/helix/components',
    priority: 0.9,
    section: 'Helix',
    title: 'Components',
  },
  {
    description: 'The cognitive substrate: memory, provenance, and context.',
    kind: 'page',
    path: '/cortex',
    priority: 0.9,
    section: 'Cortex',
    title: 'Cortex',
  },
  {
    description: 'A WebGL field, and the geometry behind it.',
    kind: 'page',
    path: '/helix/aura',
    priority: 0.4,
    section: 'Helix',
    title: 'Aura',
  },
  {
    description:
      'An editable source pane beside a live preview. Link a specific example with `?e=<family>.<slug>`.',
    kind: 'page',
    path: '/helix/sandbox',
    priority: 0.5,
    section: 'Helix',
    title: 'Sandbox',
  },
  {
    description: 'Intent inputs in, a complete contrast-guaranteed token set out.',
    kind: 'page',
    path: '/helix/theme',
    priority: 0.6,
    section: 'Helix',
    title: 'Theme builder',
  },
]

/** Every component family, from the manifest. */
const components = (): Route[] =>
  getFamilies().map((family) => ({
    description: family.summary,
    kind: 'component' as const,
    path: `/helix/components/${family.slug}`,
    priority: 0.7,
    section: 'Helix components',
    title: family.label,
  }))

/** Every documentation page, from `@fusion.dev/helix-docs`. */
const docs = (): Route[] => {
  const order = new Map(
    navigation().flatMap((section, index) =>
      section.pages.flatMap((page) => [
        [page.slug, index] as const,
        ...page.children.map((child) => [child.slug, index] as const),
      ]),
    ),
  )
  return docPages.map((page) => ({
    description: page.description,
    kind: 'doc' as const,
    path: `/helix/docs/${page.slug}`,
    priority: order.get(page.slug) === 0 ? 0.8 : 0.6,
    section: `Helix docs: ${page.section}`,
    title: page.title,
  }))
}

/** Every published insight. */
const insights = (): Route[] => [
  {
    description: 'Short pieces on what we are building and why.',
    kind: 'page',
    path: '/insights',
    priority: 0.6,
    section: 'Insights',
    title: 'Insights',
  },
  ...INSIGHTS.map((insight) => ({
    description: insight.summary,
    kind: 'insight' as const,
    path: `/insights/${insight.slug}`,
    priority: 0.5,
    section: 'Insights',
    title: insight.title,
  })),
]

/**
 * Every route, in the order `llms.txt` lists them.
 *
 * Computed rather than a constant, because two thirds of it comes from
 * generated sources: a family added to the library and a page added to
 * `@fusion.dev/helix-docs` both appear here without anyone editing this file, which is
 * the only arrangement under which the two can not drift apart.
 */
export const routes = (): Route[] => [...PROSE, ...docs(), ...components(), ...insights()]

/** The route at a given path, if this site serves one. */
export const findRoute = (path: string): Route | undefined =>
  routes().find((route) => route.path === path)

/** Routes grouped by section, in first-seen order, for `llms.txt`. */
export const routeSections = (): Array<{ routes: Route[]; section: string }> => {
  const grouped = new Map<string, Route[]>()
  for (const route of routes()) {
    grouped.set(route.section, [...(grouped.get(route.section) ?? []), route])
  }
  return [...grouped.entries()].map(([section, entries]) => ({ routes: entries, section }))
}
