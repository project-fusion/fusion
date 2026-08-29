import Link from 'next/link'
import { formatDate, type Insight } from '../../content/insights'
import styles from './insight-card.module.css'

/**
 * One post as a card: the link, the picture, the filing, the title and the date.
 *
 * One component, because the landing page's carousel and the gallery both draw
 * it and two copies of the markup drift. A shared class holds the styling
 * together while the markup diverges underneath it, which is the argument for a
 * component rather than a class: the class was never the thing worth sharing.
 *
 * The footer carries the date and the reading time, the reading time being a
 * fact a reader wants before opening something.
 *
 * `slug` is optional and only the gallery passes it. Its browser filters on the
 * client by hiding cards, and it finds them by that attribute.
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
          `check:css:overruled` exists to catch. The recipe is for elements that are
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
          <helix-text class={styles.insightSummary} tone="muted" variant="caption">
            {insight.summary}
          </helix-text>
        </helix-flex>

        {/* A machine-readable date beside the readable one. The card is the only
            place the date appears in a list, so this is where a crawler finds
            it. */}
        <helix-flex align="center" gap="sm" justify="between" slot="footer">
          <helix-text tone="subtle" variant="caption">
            <time dateTime={insight.date}>{formatDate(insight.date)}</time>
          </helix-text>
          <helix-text tone="subtle" variant="caption">
            {insight.minutes} min
          </helix-text>
        </helix-flex>
      </helix-card>
    </Link>
  )
}
