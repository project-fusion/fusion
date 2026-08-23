import type { PageCopy } from './copy'

/**
 * The services page's own words, as data.
 *
 * Named `services-copy` because `services.ts` beside it already holds the three
 * offers and feeds several consumers, and two modules called the same thing is
 * how one of them gets edited. The offers stay there; the page's prose is here,
 * and the block below names the list rather than copying it.
 */
export const SERVICES_COPY: PageCopy = {
  blocks: [
    {
      from: 'services',
      title: 'What we take on',
    },
    {
      body: [
        'Your repository, your license, your infrastructure. Handover is a condition of the work rather than a phase at the end of it, and the architecture decisions are written down with their trade-offs rather than just made. If an engagement would leave you unable to continue without us on a retainer, it is not one we will take.',
      ],
      title: 'You are not acquiring a dependency',
    },
    {
      body: [
        'Two weeks and a fixed price, and the honest answer at the end of it may be that you do not need the larger engagement. Say plainly what you are trying to do and we will tell you whether we are the right people.',
      ],
      title: 'Start with the audit',
    },
  ],
  lede: 'Everything else on this site is being built. This is the work we take on now: interface and intelligence work the substrates make faster to do well. Three offers, in the order they usually happen. Most start with the audit, which is two weeks at a fixed price, and the rest is scoped from what it finds.',
  title: 'The part of this you can buy today',
}
