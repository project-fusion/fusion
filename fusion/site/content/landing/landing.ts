import type { PageCopy } from '@/content/copy/copy'
import { ENGAGEMENT, ENGAGEMENT_COPY } from '@/content/landing/helix-landing'

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
      body: ['Most work starts with an audit of up to two weeks.'],
      from: 'services',
      kicker: 'Services',
      title: 'The part you can buy today',
    },
    {
      body: [
        'Each control in the panel is a custom element from the Helix package, running in your browser. Their colors come from one brand color.',
      ],
      kicker: 'Components',
      title: 'Live Helix components, running on the page',
    },
    {
      /* The cards live in `helix-landing.ts`, because the page renders them
         too. Holding them here alone makes this document describe a band the
         page does not have. */
      body: [ENGAGEMENT_COPY.lede],
      items: ENGAGEMENT,
      kicker: 'Working with us',
      title: ENGAGEMENT_COPY.title,
    },
    {
      from: 'insights',
      kicker: 'Insights',
      title: 'Articles from the team',
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
