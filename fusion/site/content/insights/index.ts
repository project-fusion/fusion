import { essays } from '@fusion.dev/insights'
/**
 * What an insight is about. One per post, and the filter bar reads the set off
 * the posts rather than from a list kept beside them.
 *
 * **One word each, and that is a constraint rather than a preference.** These
 * render as tags on a card, and a card in a four-column grid is around 310
 * wide: `Design systems` measured 107 of it and did not shrink, because a tag
 * sets `white-space: nowrap` and a flex item's `min-width: auto` holds it at
 * its content width. A label that cannot wrap and cannot shrink is a label that
 * eventually decides the layout. `Business` and `Design` are 71 and 62.
 *
 * They also read better as filters. `Design systems` names a discipline where
 * the others name a subject, so the set was not one list.
 */
export type Topic = 'Business' | 'Design' | 'Engineering' | 'Intelligence' | 'Sovereignty'

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
 * Constraint applied to our own pages, and the permissive licenses are the ones
 * that let you take the file rather than the link. It is also the difference
 * between two sets of terms: the Unsplash *license* asks for no attribution,
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
   * Nothing renders this. Recorded because the license that made the picture
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
   * Reading time in minutes, counted from the body at build.
   */
  minutes: number
  /**
   * The URL segment, which is the name of the post's own file.
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
 * Every post, newest first, derived from the frontmatter of its own file.
 *
 * Ordered here rather than sorted at every call site, so the resting order of
 * the page is a property of the data. The gallery re-sorts on the server when a
 * reader asks for something else.
 *
 * **There is no hand-written registry any more, and the slug is the file's
 * name.** A post is one `.mdx` in `@fusion.dev/insights`: creating one is
 * naming a file, two posts cannot silently take the same URL because two files
 * cannot take the same name, and retitling is editing frontmatter rather than
 * moving an address. A deliberate rename is a `git mv`, which is visible in
 * review and is where `turbo run routes -- --check` asks for a redirect.
 *
 * The copy is drawn from `fusion/docs/`, which is the same rule the landing
 * page follows: the argument on the site and the argument in the plan are the
 * same argument, so neither can drift into being marketing for the other.
 *
 * Shaped here rather than consumed raw, because a card wants an `image` object
 * and frontmatter is flat.
 */
export const INSIGHTS: Insight[] = essays.map((essay) => ({
  author: essay.author,
  date: essay.date,
  ...(essay.image
    ? {
        image: {
          alt: essay.imageAlt ?? '',
          ...(essay.imageCredit ? { credit: essay.imageCredit } : {}),
          src: essay.image,
        },
      }
    : {}),
  kind: essay.kind as Kind,
  minutes: essay.minutes,
  slug: essay.slug,
  summary: essay.description,
  title: essay.title,
  topic: essay.topic as Topic,
}))

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
