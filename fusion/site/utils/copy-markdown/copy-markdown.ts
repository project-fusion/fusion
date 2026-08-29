import { navigation } from '@fusion.dev/helix-docs'
import { CONTACT } from '@/content/contact/contact'
import type { CopyBlock, PageCopy } from '@/content/copy/copy'
import { LANDING } from '@/content/landing/landing'
import { PRODUCTS } from '@/content/products/products'
import { SERVICES } from '@/content/services/services'
import { AURA, SANDBOX, THEME_BUILDER } from '@/content/tools/tools'
import { VERTICALS } from '@/content/verticals/verticals'
import { getFamilies } from '../../content/catalog/catalog'
import { INSIGHTS } from '../../content/insights'
import type { Route } from '../../content/routes/routes'

/*
 * A page's copy, as the markdown its `.md` serves.
 *
 * **The same object the page renders as Helix markup.** That is the whole
 * arrangement: `landing.ts` is the source, `page.tsx` lays it out in bands of
 * components, and this lays it out as headings and paragraphs. Neither renderer
 * is authoritative and neither can drift, because there is one set of words and
 * both read it.
 *
 * This was chosen instead of a component protocol. A
 * page in MDX would need `<Statement>`, `<Verticals />` and `<Questions>`, and
 * every one of those would need a markdown renderer of its own or leave a hole
 * in the output. Here there is one renderer for one shape, and the shape is
 * data rather than markup.
 *
 * **A block names its list rather than holding it.** `verticals.ts`,
 * `products.ts` and `services.ts` already feed several consumers, so a copy
 * module that inlined their contents would be the second copy this exists to
 * remove. Resolving the name is this module's job and the page's, separately,
 * from the same arrays.
 */

/** The lists a block may draw its cards from, resolved to name and body. */
const LISTS = {
  /* Every family, from the manifest the page renders from. An agent reading
     this document gets the same list a reader sees, in the same order, without
     a second copy of it existing anywhere. */
  families: () => getFamilies().map((entry) => ({ body: entry.summary, name: entry.label })),
  /* Each documentation section and what it covers, from the same registry the
     sidebar and the index page both read. */
  guides: () =>
    navigation().map((section) => ({
      body: section.pages.map((page) => page.title).join(', '),
      name: section.title,
    })),
  insights: () => INSIGHTS.map((entry) => ({ body: entry.summary, name: entry.title })),
  products: () => PRODUCTS.map((entry) => ({ body: entry.body, name: entry.name })),
  services: () => SERVICES.map((entry) => ({ body: entry.summary, name: entry.name })),
  verticals: () => VERTICALS.map((entry) => ({ body: entry.body, name: entry.name })),
}

/** Which pages have moved their copy into a typed module. */
const COPY: Record<string, PageCopy> = {
  '/': LANDING,
  '/contact': CONTACT,
  '/helix/aura': AURA,
  '/helix/sandbox': SANDBOX,
  '/helix/theme': THEME_BUILDER,
}

/**
 * A vertical's page, which is already nothing but its registry entry.
 *
 * `VerticalPage` renders a name, a stage and a body, and takes all three from
 * `verticals.ts` and `products.ts`. There is no copy module for these and there
 * should not be: writing one would be a second copy of two registries that
 * several consumers already read. The markdown derives from the same place the
 * page does.
 *
 * **The product wins the title where a product fills the vertical**, which is
 * the rule the page follows: a reader who clicks Cortex and lands on a page
 * headed Fusion Mind has been handed a division when they asked for a product.
 */
const verticalCopy = (path: string): PageCopy | undefined => {
  const vertical = VERTICALS.find((entry) => entry.href === path)
  if (!vertical) {
    return undefined
  }
  const product = PRODUCTS.find((entry) => entry.href === path)
  return {
    blocks: [
      {
        body: [
          `**Stage: ${vertical.stage}.** ${STAGES[vertical.stage]}`,
          ...(product ? [`It is the ${vertical.name} vertical.`] : []),
        ],
        title: 'Where this stands',
      },
    ],
    lede: product ? product.body : vertical.body,
    source: 'verticals.ts and products.ts, which the page also renders from',
    title: product ? product.name : vertical.name,
  }
}

/** What a stage label means, stated rather than left to a reader to infer. */
const STAGES: Record<string, string> = {
  Active: 'It ships with users.',
  Building: 'Real work, with nothing shipped.',
  Declared: 'Committed direction, with no work started.',
}

/**
 * The insights index, which is the registry with a sentence over it.
 *
 * The posts themselves are not here. Their bodies are TSX in `bodies.tsx` and
 * turning those into markdown needs a pipeline this app does not have yet, so
 * they keep the stub and `check:gen:routes` keeps counting them.
 */
const insightsCopy = (): PageCopy => ({
  blocks: [{ from: 'insights', title: 'Everything published so far' }],
  lede: 'Short pieces on what we are building and why. Arguments rather than announcements.',
  source: 'the insight registry, which the page also renders from',
  title: 'Insights',
})

/**
 * The component index, which is the catalog with a sentence over it.
 *
 * The same shape as `insightsCopy` and for the same reason: the page is a
 * registry rendered, so its document is that registry rendered too. Writing a
 * copy module for it would be a second list of families that could disagree
 * with the manifest, which is the whole thing this arrangement exists to
 * prevent.
 *
 * Each family's own document says what it can do. This one exists so a reader
 * or an agent can find out *which* family they want, which is the question an
 * index answers and a reference does not.
 */
const componentsCopy = (): PageCopy => ({
  blocks: [{ from: 'families', title: 'Every family' }],
  lede: 'Every family Helix ships, with its API and a live example. The styled tier is what an application writes; each family extends a headless one and inherits its API.',
  source: 'custom-elements.json, which the page also renders from',
  title: 'Components',
})

/**
 * The guides index, which is the documentation registry with a sentence over it.
 *
 * Same shape as the two above. Each page's own document is served from its MDX,
 * so this one exists to say what the sections are rather than to restate any of
 * them.
 */
const guidesCopy = (): PageCopy => ({
  blocks: [{ from: 'guides', title: 'Sections' }],
  lede: "Install it, theme it, and the ideas underneath. Every family's own API lives on its page under Components; these are the guides that cross families.",
  source: 'the docs registry, which the page also renders from',
  title: 'Docs',
})

/** The copy module for a path, where one exists. */
export const copyFor = (path: string): PageCopy | undefined => {
  if (path === '/insights') {
    return insightsCopy()
  }
  if (path === '/helix/components') {
    return componentsCopy()
  }
  if (path === '/helix/docs') {
    return guidesCopy()
  }
  return COPY[path] ?? verticalCopy(path)
}

/**
 * One band, as its heading, its paragraphs, and its cards.
 *
 * **A band with no heading puts its cards a level up.** On screen the bands are
 * separated by space and a rule, so a section can open straight into its cards;
 * in a document there is nothing between them, and an `h3` under no `h2` is a
 * heading level with nothing above it. The first band is exactly that case: it
 * is two product cards under a sentence, deliberately without a title, because
 * a heading there would name what the reader can already see.
 */
const block = (entry: CopyBlock, pageTitle: string): string[] => {
  const lines: string[] = []
  /* A block whose title is the page's own does not repeat it. On screen the
     two are far apart, a hero and then a section further down, and the
     repetition reads as the page announcing where you are. In a document they
     land four lines from each other. Trust is the case: its bar is the page. */
  const own = entry.title !== undefined && entry.title !== pageTitle
  if (own) {
    lines.push(`## ${entry.title}`, '')
  }
  for (const paragraph of entry.body ?? []) {
    lines.push(paragraph, '')
  }
  const depth = own ? '###' : '##'
  const items = entry.items ?? (entry.from ? LISTS[entry.from]() : [])
  for (const item of items) {
    lines.push(`${depth} ${item.name}`, '', item.body, '')
  }
  return lines
}

/**
 * A page, as markdown.
 *
 * The kicker is dropped rather than rendered. It is a label above a heading,
 * which is a thing a layout does to separate two bands on a screen; in a
 * document the heading is already separated by being a heading, and a line of
 * one word above it reads as a stray fragment.
 */
export const renderCopy = (route: Route, copy: PageCopy): string => {
  const lines = [
    '---',
    `title: ${copy.title}`,
    `description: ${copy.lede}`,
    `path: ${route.path}`,
    `source: ${copy.source ?? 'the typed copy module this page also renders from'}`,
    '---',
    '',
    `# ${copy.title}`,
    '',
    copy.lede,
    '',
    ...copy.blocks.flatMap((entry) => block(entry, copy.title)),
  ]
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}
