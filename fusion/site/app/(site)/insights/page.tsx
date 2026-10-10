import { InsightCard } from '@/components/insight-card/insight-card'
import { pageMetadata } from '@/utils/metadata/metadata'
import { INSIGHTS } from '../../../content/insights'
import { InsightBrowser } from './insight-browser'
import styles from './page.module.css'
import { SORTS } from './sorts'

export const metadata = pageMetadata({
  description: 'The arguments behind what we build, written where they can be checked.',
  path: '/insights',
  title: 'Insights',
})

/**
 * Insights: a hero, a filter bar, and a grid of posts.
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
      <helix-grid className={styles.insightGrid} columns={5} gap="xl">
        {insights.map((insight) => (
          <InsightCard insight={insight} key={insight.slug} slug />
        ))}
      </helix-grid>
    </InsightBrowser>
  )
}
