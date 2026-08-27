import Link from 'next/link'
import { formatDate, type Insight } from '@/content/insights'
import { InsightCover } from './insight-cover'
import styles from './preview.module.css'

/**
 * An essay, as a card with a generated plate.
 *
 * **A local card rather than the shared `InsightCard`.** That one renders
 * `InsightArt`, which returns null when an essay has no image, and none of them
 * has one. Teaching it to fall back to a generated plate would put the drafts'
 * art into a component the live site shares, and that is a decision for whoever
 * promotes this rather than for a preview.
 *
 * **The index is threaded rather than derived**, because the cover picks its
 * variant from position in the reel and a card cannot know its own.
 */
export const InsightPlate = ({ index, insight }: { index: number; insight: Insight }) => (
  <Link aria-label={insight.title} className={styles.plate} href={`/insights/${insight.slug}`}>
    <InsightCover index={index} slug={insight.slug} topic={insight.topic} />
    <div className={styles.plateBody}>
      <helix-flex align="center" data-density="sm" gap="sm" wrap>
        <helix-tag tone="primary">{insight.topic}</helix-tag>
        <helix-tag>{insight.kind}</helix-tag>
      </helix-flex>
      <p className={styles.plateTitle}>{insight.title}</p>
      <p className={styles.plateSummary}>{insight.summary}</p>
      <p className={styles.plateDate}>{formatDate(insight.date)}</p>
    </div>
  </Link>
)
