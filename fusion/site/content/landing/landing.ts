import type { PageCopy } from '@/content/copy/copy'
import { AGENT_EXCHANGE, AGENT_SURFACES } from '@/content/landing/agents'
import { CHECKS_INTENT, GENERATOR_CHECKS } from '@/content/landing/checks'
import { DELIVERY, ENGAGEMENT, MECHANISMS } from '@/content/landing/helix-landing'

/** One mechanism card, named the way its proof band is. */
const mechanism = (name: string) => {
  const found = MECHANISMS.find((one) => one.name === name)
  if (!found) {
    throw new Error(`landing: no ${name} card`)
  }
  return found
}

const checks = mechanism('Checks')
const agents = mechanism('Agents')

/**
 * Everything the landing page says, as data.
 *
 * The page renders it as bands of Helix markup; `turbo run catalog` renders the
 * same object as `/index.md`. Neither is the source: this is.
 *
 * Only the words live here. The reasoning behind each band stays as a comment
 * in `page.tsx`, beside the layout it explains, because it is about why the
 * section is shaped that way rather than about what it says.
 */
export const LANDING: PageCopy = {
  blocks: [
    {
      /* No kicker and no title. Two named cards and a services block below them
         are already legible as a choice; a heading above saying some version of
         "here are the things" is a row of chrome that names what the reader can
         already see. */
      body: ['Two products that install from npm and ship as custom elements.'],
      from: 'products',
    },
    {
      body: [DELIVERY.lede],
      from: 'services',
      items: ENGAGEMENT,
      kicker: 'Services',
      title: DELIVERY.title,
    },
    {
      body: ['Each control in the panel is a custom element from the Helix package.'],
      kicker: 'Components',
      title: 'The panel runs in your browser',
    },
    {
      /* **The catch in words, without its measured ratio.** The page measures
         the pair with the theme engine, which is WebAssembly and loads
         asynchronously, and this object is read synchronously by the catalog.
         So the mirror says what the page shows and leaves the ratio to the
         page. */
      body: [
        checks.bullets[0] ?? '',
        `One pair that failed: body text pinned to a mid gray, which the engine measures on the page background and reports below the ${CHECKS_INTENT.contrastTarget}:1 target.`,
        `The ${GENERATOR_CHECKS.length} generator checks:`,
        GENERATOR_CHECKS.map((name) => `- \`${name}\``).join('\n'),
      ],
      kicker: checks.name,
      title: checks.claim,
    },
    {
      body: [
        `Question: ${AGENT_EXCHANGE.question}`,
        `Request: ${AGENT_EXCHANGE.url}`,
        `Answer: ${AGENT_EXCHANGE.answer} ${AGENT_EXCHANGE.line}`,
        ...AGENT_SURFACES.map((surface) => `${surface.label}: ${surface.href}`),
      ],
      kicker: agents.name,
      title: agents.claim,
    },
    {
      from: 'insights',
      kicker: 'Insights',
      title: 'How we decide, and why',
    },
    {
      body: ['Tell us what you need built. If we are not the right team for it, we will tell you.'],
      title: 'Work with us',
    },
  ],
  /**
   * Both halves of the offer in one line: the system is takeable and the
   * engineering is hireable. It is the route registry's description of `/` and
   * the frontmatter of `/index.md`.
   */
  lede: 'Use Helix on your own, or hire us to build with it.',
  /**
   * **The hero's headline, because this document is that page.**
   *
   * A second wording anywhere is the drift `routes.ts` names this module the
   * source to remove: `/index.md` renders from here, so a headline written
   * elsewhere opens the file on words no reader of the page has seen.
   *
   * The site's own name stays the *route* title, which is what a sitemap and a
   * search result want. This is the `h1`, and the `h1` is the heading.
   */
  title: 'An intelligent design system, and the engineers behind it',
}

/** The one line the hero asks a reader to run rather than to read. */
export const INSTALL = 'bun add @fusion.dev/helix'
