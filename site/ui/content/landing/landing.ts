import type { PageCopy } from '@/content/copy/copy'
import { ENGAGEMENT, ENGAGEMENT_COPY } from '@/content/landing/helix-landing'

/**
 * Everything the landing page says, as data.
 *
 * The page renders it as bands of Helix markup; `bun run catalog` renders the
 * same object as `/index.md`. Neither is the source: this is, and that is the
 * whole point. The `.md` used to be a stub saying "this page renders from a
 * typed module", which was honest and useless.
 *
 * The reasoning behind each band stays as a comment in `page.tsx`, beside the
 * layout it explains, because it is about why the section is shaped that way
 * rather than about what it says. What moved here is only the words.
 */
export const LANDING: PageCopy = {
  blocks: [
    {
      /* No kicker and no title. Two named cards and a services block below them
         are already legible as a choice; a heading above saying some version of
         "here are the things" is a row of chrome that names what the reader can
         already see. */
      body: [
        'Two substrates, both in production. They install from npm and ship as custom elements, so the framework above them stays your choice.',
      ],
      from: 'products',
    },
    {
      body: [
        'It starts with a two week audit, and every price is published: an offer you cannot compare is not an offer.',
      ],
      from: 'services',
      kicker: 'Services',
      title: 'The part you can buy today',
    },
    {
      body: [
        'Every control beside this is a custom element from the library, rendered here rather than pictured. The palette under them is derived from one brand color, which is why nothing had to be chosen twice.',
      ],
      kicker: 'Helix',
      title: 'Drawn by the thing it documents',
    },
    {
      /* The cards live in `helix-landing.ts` now, because the page renders them
         too. They were only here, which made this document describe a band the
         page did not have. */
      body: [ENGAGEMENT_COPY.lede],
      items: ENGAGEMENT,
      kicker: 'The engagement',
      title: ENGAGEMENT_COPY.title,
    },
    {
      from: 'insights',
      kicker: 'Insights',
      title: 'The arguments, written down',
    },
    {
      body: ['Tell us what you need built. We will say plainly if we are not the right people.'],
      title: 'Take on the work',
    },
  ],
  /**
   * Both halves of the offer in one line: the system is takeable and the
   * engineering is hireable. It is the route registry's description of `/` and
   * the frontmatter of `/index.md`.
   */
  lede: 'Take Helix and go, or hire us to build with it.',
  /**
   * **The hero's headline, because this document is that page.**
   *
   * This read "The interface layer, already built" while the page it mirrors
   * said something else entirely, so `/index.md` opened on a headline no reader
   * of the page had seen. The note in `routes.ts` calls this module the source
   * for the title and warns that a second wording is the drift it exists to
   * remove; the second wording had grown here instead of there.
   *
   * The site's own name stays the *route* title, which is what a sitemap and a
   * search result want. This is the `h1`, and the `h1` is the heading.
   */
  title: 'An intelligent design system, and the engineers behind it',
}

/** The one line the hero asks a reader to run rather than to read. */
export const INSTALL = 'bun add @helix-io/styled'
