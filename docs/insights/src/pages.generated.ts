/**
 * The site's pages and essays, derived from the frontmatter of each file by
 * `bun run content`. Do not edit: the files in `content/` are the source, and
 * `bun run check:content` fails when this module and they disagree.
 *
 * **The slug is the file name.** Nothing here assigns one.
 */
import type { SiteEssay, SitePage } from './index.js'

export const generatedPages: SitePage[] = [
  {
    description: 'What the sandbox will run, what it will not, and why the limits are so few.',
    kicker: 'Acceptable use',
    path: '/acceptable-use',
    slug: 'acceptable-use',
    title: 'What you may run here',
  },
  {
    description:
      'Three preference keys, no cookies, no analytics, and nothing that identifies you.',
    kicker: 'Privacy',
    path: '/privacy',
    slug: 'privacy',
    title: 'What this site stores, which is almost nothing',
  },
  {
    appends: 'services',
    description: 'What we take on, and what it costs.',
    kicker: 'Services',
    lede: 'Everything else on this site is being built. This is the work we take on now: interface and intelligence work the substrates make faster to do well. Three offers, in the order they usually happen. Most start with the audit, which is two weeks at a fixed price, and the rest is scoped from what it finds.',
    path: '/services',
    slug: 'services',
    title: 'The part of this you can buy today',
  },
  {
    description: 'What we offer, what we do not, and the one clause the sandbox makes specific.',
    kicker: 'Terms',
    path: '/terms',
    slug: 'terms',
    title: 'Terms of use',
  },
  {
    description: 'Sovereignty at every scale, and the mechanism that makes it practical.',
    kicker: 'Thesis',
    path: '/thesis',
    slug: 'thesis',
    title: 'Sovereignty is the goal. Abundance is the mechanism.',
  },
  {
    description:
      'The finite checklist every Fusion product clears before it ships, and an honest account of what has been tested so far.',
    kicker: 'Trust',
    path: '/trust',
    slug: 'trust',
    title: 'What has to be true before anything ships',
  },
]

export const generatedEssays: SiteEssay[] = [
  {
    author: 'Ross Sheppard',
    date: '2026-08-18',
    description:
      'No pro components and no paywalled API surface. The architectural reason is stronger than the economic one.',
    kind: 'Decision',
    minutes: 2,
    path: '/insights/helix-ships-as-one-open-tier',
    slug: 'helix-ships-as-one-open-tier',
    title: 'Helix ships as one open tier',
    topic: 'Design',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-08-11',
    description:
      'A spreadsheet of hexes is a set of decisions nobody can check. Deriving the palette makes contrast a property of the system rather than a review step.',
    kind: 'Essay',
    minutes: 2,
    path: '/insights/a-palette-from-one-brand-color',
    slug: 'a-palette-from-one-brand-color',
    title: 'A palette from one brand color',
    topic: 'Design',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-07-29',
    description:
      'Active ships with users. Building is real work with nothing shipped. Declared is committed direction with no work started. Why we refuse to soften them.',
    kind: 'Note',
    minutes: 1,
    path: '/insights/stage-labels-are-honest',
    slug: 'stage-labels-are-honest',
    title: 'Stage labels are honest',
    topic: 'Business',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-07-14',
    description:
      'Full-repo lockstep would publish a Cortex fix as a new version of the Helix docs. Per-domain keeps the only property that matters.',
    kind: 'Decision',
    minutes: 2,
    path: '/insights/lockstep-per-domain',
    slug: 'lockstep-per-domain',
    title: 'Lockstep versioning, one domain at a time',
    topic: 'Engineering',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-06-30',
    description:
      'No Fusion product may create a dependency its user cannot exit. One sentence, and it forecloses most of the business models available to us.',
    kind: 'Essay',
    minutes: 2,
    path: '/insights/the-sovereignty-constraint',
    slug: 'the-sovereignty-constraint',
    title: 'The Sovereignty Constraint',
    topic: 'Sovereignty',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-06-16',
    description:
      'Cheap intelligence and cheap energy are arriving together. That pairing is what moves sovereignty from a principle you agree with to a thing you can run.',
    kind: 'Essay',
    minutes: 2,
    path: '/insights/sovereignty-at-every-scale',
    slug: 'sovereignty-at-every-scale',
    title: 'Sovereignty at every scale',
    topic: 'Sovereignty',
  },
]
