import { CONTACT } from '../app/contact'
import type { CopyBlock, PageCopy } from '../app/copy'
import { LANDING } from '../app/landing'
import { PRODUCTS } from '../app/products'
import { SERVICES } from '../app/services'
import { SERVICES_COPY } from '../app/services-copy'
import { THESIS } from '../app/thesis'
import { TRUST } from '../app/trust'
import { VERTICALS } from '../app/verticals'
import { INSIGHTS } from './insights'
import type { Route } from './routes'

/**
 * A page's copy, as the markdown its `.md` serves.
 *
 * **The same object the page renders as Helix markup.** That is the whole
 * arrangement: `landing.ts` is the source, `page.tsx` lays it out in bands of
 * components, and this lays it out as headings and paragraphs. Neither renderer
 * is authoritative and neither can drift, because there is one set of words and
 * both read it.
 *
 * This is what `12-ai-native-web.md` chose instead of a component protocol. A
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
  insights: () => INSIGHTS.map((entry) => ({ body: entry.summary, name: entry.title })),
  products: () => PRODUCTS.map((entry) => ({ body: entry.body, name: entry.name })),
  services: () => SERVICES.map((entry) => ({ body: entry.summary, name: entry.name })),
  verticals: () => VERTICALS.map((entry) => ({ body: entry.body, name: entry.name })),
}

/** Which pages have moved their copy into a typed module. */
const COPY: Record<string, PageCopy> = {
  '/': LANDING,
  '/contact': CONTACT,
  '/services': SERVICES_COPY,
  '/thesis': THESIS,
  '/trust': TRUST,
}

/** The copy module for a path, where one exists. */
export const copyFor = (path: string): PageCopy | undefined => COPY[path]

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
    'source: the typed copy module this page also renders from',
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
