import Link from 'next/link'
import { InsightArt } from '../../lib/insight-art'
import { formatDate, type Insight } from '../../lib/insights'
import styles from './insight-card.module.css'

/**
 * One post as a card: the link, the picture, the filing, the title and the date.
 *
 * **Extracted because it had already drifted.** The same markup was written out
 * twice, on the landing page's carousel and on the gallery, and the two copies
 * stopped agreeing: the gallery's footer carried the date and the reading time,
 * the carousel's carried only the date. A comment in the carousel's copy even
 * recorded a previous drift, that "the two places a card appears described a
 * post differently", which was fixed by editing both copies rather than by
 * noticing there should not be two.
 *
 * A shared class held the styling together while the markup diverged underneath
 * it. That is the argument for a component rather than a class: the class was
 * never the thing worth sharing.
 *
 * **The gallery's footer is the one that survived.** It is the richer of the
 * two and the reading time is a fact a reader wants before opening something,
 * so the carousel gains it. Unifying had to pick one, and picking the poorer
 * one to avoid a visible change would have been the wrong reason.
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
      <helix-card separation="elevated">
        <InsightArt image={insight.image} slot="media" />

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
          <helix-text tone="muted" variant="caption">
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
