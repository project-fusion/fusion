import type { PageCopy } from '@/content/copy/copy'
import { AGENT_EXCHANGE, AGENT_SURFACES } from '@/content/landing/agents'
import { CHECKS_INTENT, GENERATOR_CHECKS } from '@/content/landing/checks'
import { DELIVERY, ENGAGEMENT, HERO, MECHANISMS, PROBLEM } from '@/content/landing/helix-landing'

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
      /* No kicker and no title: this is the rest of the hero. */
      body: [`\`${HERO.install}\``, HERO.works],
    },
    {
      /* The page draws this as a diagram, and these are the words it reads out. */
      body: [
        'Your brand, your code, and your decisions flow into Fusion. Out of it come Helix, which checks every screen, and Cortex, which keeps every decision with its reason.',
      ],
      from: 'products',
      title: 'What goes into Fusion and what comes out',
    },
    {
      body: [PROBLEM.lede],
      items: MECHANISMS.map((one) => ({ body: `${one.bullets.join('. ')}.`, name: one.claim })),
      title: PROBLEM.title,
    },
    {
      body: ['You enter one brand color, and Helix computes every token from it.'],
      kicker: 'Theming',
      title: 'Every pair Helix solves, checked for contrast',
    },
    {
      body: ['Each control in it is a custom element from the Helix package.'],
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
      body: [
        'Charts, data tables, chat, and date pickers use the same tokens as your buttons.',
        'Compare the systems: /helix/docs/metrics#what-each-system-ships',
      ],
      kicker: 'Coverage',
      title: 'Every component in one package',
    },
    {
      body: [DELIVERY.lede],
      from: 'services',
      items: ENGAGEMENT,
      kicker: 'Services',
      title: DELIVERY.title,
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
   * The hero's line, because this document is that page. It is the route
   * registry's description of `/` and the frontmatter of `/index.md`.
   */
  lede: HERO.lede,
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
