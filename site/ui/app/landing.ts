import type { PageCopy } from './copy'

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
        'Every control beside this is a custom element from the library, rendered here rather than pictured. The palette under them is derived from one brand colour, which is why nothing had to be chosen twice.',
      ],
      kicker: 'Helix',
      title: 'Drawn by the thing it documents',
    },
    {
      /* What only this section can say is what the engagement is actually like,
         which is what its four cards answer. */
      items: [
        {
          body: 'A token layer, two tiers, generated framework wrappers, a sandbox and the checks that keep it honest. We are not learning this on your project.',
          name: 'The system already exists',
        },
        {
          body: 'Four weeks, two days a week, because the hard part is behind us. Starting from nothing, the same deliverable is quoted in months.',
          name: 'It is faster because of that',
        },
        {
          body: 'Your repository, your license. Handover is a condition of the work rather than a phase at the end, and no engagement should leave you needing us on a retainer.',
          name: 'You keep all of it',
        },
        {
          body: 'Active ships with users. Building is real work with nothing shipped. Declared is a direction. Nothing here is described as further along than it is.',
          name: 'We tell you what is not done',
        },
      ],
      title: 'How the work goes',
    },
    {
      from: 'insights',
      kicker: 'Insights',
      title: 'The arguments, written down',
    },
    {
      body: [
        'Tell us what you need built. We will say plainly whether we are the right people for it.',
      ],
      title: 'Take on the work',
    },
  ],
  lede: 'Take Helix and go, or hire us to build with it.',
  title: 'The interface layer, already built',
}

/** The one line the hero asks a reader to run rather than to read. */
export const INSTALL = 'bun add @helix-io/web'
