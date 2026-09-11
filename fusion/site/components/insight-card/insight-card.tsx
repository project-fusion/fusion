import Link from 'next/link'
import { formatDate, type Insight } from '../../content/insights'
import styles from './insight-card.module.css'

/**
 * One post as a card: the link, the picture, the filing, the title and the date.
 */
export function InsightCard({ insight, slug = false }: { insight: Insight; slug?: boolean }) {
  return (
    <Link
      aria-label={insight.title}
      className={styles.insightCard}
      data-card
      data-slug={slug ? insight.slug : undefined}
      href={`/insights/${insight.slug}`}
    >
      {/* **The component's own attribute, not `data-material`.** `Card` carries
          `material` as a reflected property, so the recipe would be the second
          way to say one thing and the component is the one that owns its
          surface: `--card-backdrop` and `--card-background-color` are the hooks
          that tune it, and a document rule reaching past them is what
          `helix component`'s `overruled` exists to catch. The recipe is for elements that are
          not components. */}
      <helix-card material="glass" separation="elevated">
        {/* Both facts as tags, and toned the way the post's own page tones them:
            the subject carries the brand and the kind of writing stays neutral
            beside it. */}
        <helix-flex align="center" data-density="sm" gap="sm" slot="header" wrap>
          <helix-tag tone="primary">{insight.topic}</helix-tag>
          <helix-tag>{insight.kind}</helix-tag>
        </helix-flex>

        <helix-flex direction="column" gap="xs">
          <helix-text as="h3" variant="title">
            {insight.title}
          </helix-text>
          <helix-text class={styles.insightSummary} emphasis="muted" variant="caption">
            {insight.summary}
          </helix-text>
        </helix-flex>

        {/* A machine-readable date beside the readable one. The card is the only
            place the date appears in a list, so this is where a crawler finds
            it. */}
        <helix-flex align="center" gap="sm" justify="between" slot="footer">
          <helix-text emphasis="subtle" variant="caption">
            <time dateTime={insight.date}>{formatDate(insight.date)}</time>
          </helix-text>
          <helix-text emphasis="subtle" variant="caption">
            {insight.minutes} min
          </helix-text>
        </helix-flex>
      </helix-card>
    </Link>
  )
}
