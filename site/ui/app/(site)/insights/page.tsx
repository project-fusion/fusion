import Link from 'next/link'
import { InsightArt } from '../../../lib/insight-art'
import { formatDate, INSIGHTS, type Insight } from '../../../lib/insights'
import { InsightBrowser } from './insight-browser'

export const metadata = {
  description: 'The arguments behind what we build, written where they can be checked.',
  title: 'Insights',
}

/**
 * How the grid may be ordered, and what each one compares.
 *
 * `newest` is the resting order because a post is dated and a reader arriving
 * at a writing page wants the most recent one first. `title` is here for the
 * reader who remembers a name, and every comparison falls back to the title so
 * the order is defined rather than whatever the registry happened to hold.
 */
const SORTS: Record<string, (a: Insight, b: Insight) => number> = {
  newest: (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  oldest: (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title),
}

/**
 * Insights: a hero, a filter bar, and a grid of posts.
 *
 * The same shape as the Helix gallery, and deliberately: they are the two
 * places on the site where a reader is looking for one of a set, so they should
 * not be two different pages to learn. What differs is that the cards here are
 * text rather than drawings, which is why this hero takes the shared structure
 * and none of the lattice.
 *
 * A server component. The sort is applied here, for the reading-order reason
 * `InsightBrowser` sets out.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; sort?: string; topic?: string }>
}) {
  const { kind, q, sort, topic } = await searchParams
  const order = sort && sort in SORTS ? sort : 'newest'
  const insights = [...INSIGHTS].sort(SORTS[order])

  return (
    <InsightBrowser
      index={insights}
      /* Seeded from the URL on the server, so a shared link arrives already
         filtered rather than rendering every post and hiding most of them a
         frame later. */
      initialKind={kind ?? ''}
      initialQuery={q ?? ''}
      initialTopic={topic ?? ''}
      order={order}
      sorts={Object.keys(SORTS)}
    >
      <helix-grid className="insightGrid" columns={4} gap="xl">
        {insights.map((insight) => (
          <Link
            aria-label={insight.title}
            className="insightCard"
            data-card
            data-slug={insight.slug}
            href={`/insights/${insight.slug}`}
            key={insight.slug}
          >
            <helix-card appearance="outlined">
              <InsightArt image={insight.image} slot="media" />
              <helix-flex align="center" data-density="sm" gap="sm" slot="header" wrap>
                {/* Both facts as tags, and toned the way the post's own page
                    tones them: the subject carries the brand and the kind of
                    writing stays neutral beside it. The kind was caption text
                    here, which made the pair read as a label and a footnote
                    rather than as two filters, and made the card disagree with
                    the page it opens. */}
                <helix-tag tone="primary">{insight.topic}</helix-tag>
                <helix-tag>{insight.kind}</helix-tag>
              </helix-flex>
              <helix-flex direction="column" gap="xs">
                <helix-text appearance="title" as="h3">
                  {insight.title}
                </helix-text>
                <helix-text appearance="caption" tone="muted">
                  {insight.summary}
                </helix-text>
              </helix-flex>
              <helix-flex align="center" gap="sm" justify="between" slot="footer">
                {/* A machine-readable date beside the readable one. The card is
                    the only place the date appears in a list, so this is where
                    a crawler can find it. */}
                <helix-text appearance="caption" tone="subtle">
                  <time dateTime={insight.date}>{formatDate(insight.date)}</time>
                </helix-text>
                <helix-text appearance="caption" tone="subtle">
                  {insight.minutes} min
                </helix-text>
              </helix-flex>
            </helix-card>
          </Link>
        ))}
      </helix-grid>
    </InsightBrowser>
  )
}
