import { INSIGHTS, type Insight } from '../../../content/insights'
import { InsightCard } from '../insight-card'
import { InsightBrowser } from './insight-browser'
import styles from './insights.module.css'

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
      <helix-grid className={styles.insightGrid} columns={4} gap="xl">
        {insights.map((insight) => (
          <InsightCard insight={insight} key={insight.slug} slug />
        ))}
      </helix-grid>
    </InsightBrowser>
  )
}
