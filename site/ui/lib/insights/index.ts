/**
 * What an insight is about. One per post, and the filter bar reads the set off
 * the posts rather than from a list kept beside them.
 */
export type Topic = 'Company' | 'Design systems' | 'Engineering' | 'Intelligence' | 'Sovereignty'

/**
 * What kind of writing it is, which is a different question from what it is
 * about and is worth filtering separately.
 *
 * `Decision` earns its place: a decision log entry is a claim about what was
 * settled and when, and a reader looking for one is not looking for an essay.
 */
export type Kind = 'Decision' | 'Essay' | 'Note'

/**
 * A picture for a post's card, where a post has one.
 *
 * **Optional, and the painted field is not a placeholder for it.** A post with
 * no picture renders the generated field, which is a finished state rather than
 * a gap waiting to be filled, so the set can be half photographed without
 * looking half done.
 *
 * Self-hosted under `public/`, never a vendor URL. Hotlinking a stock library's
 * CDN makes it a runtime dependency of the site, which is the Sovereignty
 * Constraint applied to our own pages, and the permissive licences are the ones
 * that let you take the file rather than the link. It is also the difference
 * between two sets of terms: the Unsplash *licence* asks for no attribution,
 * while their *API* requires it.
 */
export interface InsightImage {
  /**
   * What the picture shows, for a reader who cannot see it.
   *
   * Not the title again. The card already carries the title next to this, so
   * repeating it spends a screen reader's time saying the same words twice.
   */
  alt: string
  /**
   * Where it came from, as a note to us rather than to a reader.
   *
   * Nothing renders this. Recorded because the licence that made the picture
   * free is a fact about the file, and a year from now the only way to answer
   * whether it can stay is to know where it came from. Photographer and source,
   * enough to find it again.
   */
  credit?: string
  /**
   * The path under `public/`, as `/insights/some-post.jpg`.
   */
  src: string
}

/**
 * One post, reduced to what a card, a filter and a sort need.
 *
 * **Metadata only, and the body is deliberately not on it.** The gallery filters
 * on the client, so everything on this type crosses the bundle boundary; a body
 * hanging off it would send every essay to the browser to answer a question
 * about a title. `bodies.tsx` holds the prose and only the detail route imports
 * it. This is the split `BrowsableFamily` already documents on the Helix side.
 */
export interface Insight {
  /**
   * Who wrote it. `Avatar` derives the initials, so nothing else is needed for
   * the byline to render.
   */
  author: string
  /**
   * Publication date, ISO `YYYY-MM-DD`, which is what sorts and what displays.
   */
  date: string
  /**
   * A picture for the card, if this post has one.
   */
  image?: InsightImage
  /**
   * What kind of writing it is.
   */
  kind: Kind
  /**
   * Reading time in minutes.
   *
   * Authored rather than derived. The bodies are JSX, so counting their words
   * would mean walking a React tree at build time to save an integer, and the
   * number is a courtesy rather than a measurement. Keep it roughly true.
   */
  minutes: number
  /**
   * The URL segment, matched against `[a-z0-9-]` before it reaches a route.
   */
  slug: string
  /**
   * The line under the title, on the card and at the top of the post.
   */
  summary: string
  /**
   * What it is about.
   */
  topic: Topic
  /**
   * The title, as an `h1` on the post and an `h3` on its card.
   */
  title: string
}

/**
 * Everything published, newest first.
 *
 * Ordered here rather than sorted at every call site, so the resting order of
 * the page is a property of the data. The gallery re-sorts on the server when a
 * reader asks for something else.
 *
 * The copy is drawn from `docs/`, which is the same rule the landing page
 * follows: the argument on the site and the argument in the plan are the same
 * argument, so neither can drift into being marketing for the other.
 */
export const INSIGHTS: Insight[] = [
  {
    author: 'Ross Sheppard',
    date: '2026-08-18',
    kind: 'Decision',
    minutes: 4,
    slug: 'helix-ships-as-one-open-tier',
    summary:
      'No pro components and no paywalled API surface. The architectural reason is stronger than the economic one.',
    title: 'Helix ships as one open tier',
    topic: 'Design systems',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-08-11',
    kind: 'Essay',
    minutes: 5,
    slug: 'a-palette-from-one-brand-color',
    summary:
      'A spreadsheet of hexes is a set of decisions nobody can check. Deriving the palette makes contrast a property of the system rather than a review step.',
    title: 'A palette from one brand color',
    topic: 'Design systems',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-07-29',
    kind: 'Note',
    minutes: 3,
    slug: 'stage-labels-are-honest',
    summary:
      'Active ships with users. Building is real work with nothing shipped. Declared is committed direction with no work started. Why we refuse to soften them.',
    title: 'Stage labels are honest',
    topic: 'Company',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-07-14',
    kind: 'Decision',
    minutes: 4,
    slug: 'lockstep-per-domain',
    summary:
      'Full-repo lockstep would publish a Cortex fix as a new version of the Helix docs. Per-domain keeps the only property that matters.',
    title: 'Lockstep versioning, one domain at a time',
    topic: 'Engineering',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-06-30',
    kind: 'Essay',
    minutes: 6,
    slug: 'the-sovereignty-constraint',
    summary:
      'No Fusion product may create a dependency its user cannot exit. One sentence, and it forecloses most of the business models available to us.',
    title: 'The Sovereignty Constraint',
    topic: 'Sovereignty',
  },
  {
    author: 'Ross Sheppard',
    date: '2026-06-16',
    kind: 'Essay',
    minutes: 7,
    slug: 'sovereignty-at-every-scale',
    summary:
      'Cheap intelligence and cheap energy are arriving together. That pairing is what moves sovereignty from a principle you agree with to a thing you can run.',
    title: 'Sovereignty at every scale',
    topic: 'Sovereignty',
  },
]

/**
 * One post by slug, for the detail route's params.
 */
export const findInsight = (slug: string): Insight | undefined =>
  INSIGHTS.find((insight) => insight.slug === slug)

/**
 * The date as a reader reads it, in the one place that decides the format.
 *
 * `UTC`, explicitly. An ISO date with no time is parsed as midnight UTC, and
 * formatting that in a timezone behind it renders the day before: a post dated
 * the first shows as the last day of the previous month for every reader west
 * of Greenwich. The server and the client would also disagree, which is a
 * hydration mismatch on every card in the grid.
 */
export const formatDate = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  })
