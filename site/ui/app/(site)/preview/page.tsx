import Link from 'next/link'
import { pageMetadata } from '@/utils/metadata/metadata'
import styles from './preview.module.css'

export const metadata = pageMetadata({
  description: 'The landing page draft, and one open question about the nav.',
  path: '/preview',
  title: 'Drafts',
})

/**
 * What is left after A and B.
 *
 * **Three drafts became one because two of them stopped being comparisons.**
 * A opened on the reader's problem and B on the mechanism, which was a real
 * question worth putting side by side. Everything since — the derivation
 * drawing, the theme pill, the measured band, the insight plates — went into C
 * alone, so A and B were not the other side of an argument any more, they were
 * the same page from several hours earlier. Keeping them would have meant three
 * things to update on every change and two of them stale by the next one.
 *
 * The nav question below never resolved and is the only thing here that is
 * still genuinely two-sided.
 */
const NAVS = [
  {
    labels: ['Products', 'Services', 'Insights'],
    name: 'Products',
    note: 'What ships today, and already reasoned through in site-nav. Accurate, and the word does no work: every site has products.',
  },
  {
    labels: ['Platform', 'Services', 'Insights'],
    name: 'Platform',
    note: 'Implies one hosted thing you log into, which is the opposite of `bun add` and contradicts the constraint in CLAUDE.md.',
  },
  {
    labels: ['Helix', 'Cortex', 'Services', 'Insights'],
    name: 'Named directly',
    note: 'Names the two things instead of the category holding them. A dropdown is for when there are too many to name, and there are two.',
  },
]

export default function PreviewIndex() {
  return (
    <div>
      <section data-band>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="md">
            <p className={styles.tLabel}>Draft</p>
            <h1 className={styles.tTitle}>The landing page, rebuilt around Helix</h1>
            <p className={styles.tLede}>
              Not the site. Helix first, with the engagements framed as how it arrives rather than
              as a separate menu.
            </p>
            <helix-flex data-density="lg">
              <Link data-button="solid" data-button-tone="primary" href="/preview/c">
                Open the draft
              </Link>
            </helix-flex>
          </helix-flex>
        </helix-flex>
      </section>

      <section data-band>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="md">
            <p className={styles.tLabel}>Still open</p>
            <h2 className={styles.tTitle}>Products, Platform, or the names themselves</h2>
          </helix-flex>

          <helix-flex direction="column" gap="lg">
            {NAVS.map((nav) => (
              <div className={styles.navSample} key={nav.name}>
                <helix-flex direction="column" gap="sm">
                  <div className={styles.navRow}>
                    {nav.labels.map((label) => (
                      <span className={styles.tLabel} key={label}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className={styles.plateSummary}>{nav.note}</p>
                </helix-flex>
              </div>
            ))}
          </helix-flex>
        </helix-flex>
      </section>
    </div>
  )
}
