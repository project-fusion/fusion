import { navigation } from '@fusion.dev/helix-docs'
import Link from 'next/link'
import { docsShell } from '@/components/docs-shell/docs-shell'
import { pageMetadata } from '@/utils/metadata/metadata'
import styles from './page.module.css'

/**
 * The guides index, which is a page rather than a redirect to the first page of
 * the first section.
 */
export const metadata = pageMetadata({
  description: 'Install it, theme it, and the ideas underneath.',
  path: '/helix/docs',
  title: 'Docs',
})

export default function DocsIndex() {
  return (
    /* **`docsMain`, not the vertical product shell.**
       `vertical-page.module.css` carries `padding-block: var(--site-band)`, the
       marketing band inset that `/helix` and `/cortex` need because they have no
       chrome above them. Inside the docs layout, which already pads 48px below
       the header, the two stack: the index's title sits at 249 where every page
       it links to starts at 134, and 108px below its own sidebar. An index that
       does not line up with its siblings reads as a different kind of page. */
    <main className={docsShell.docsMain}>
      <helix-flex class={styles.head} direction="column" gap="sm">
        <helix-flex align="center" data-density="sm" gap="xs">
          <helix-tag>Helix</helix-tag>
        </helix-flex>
        <helix-text as="h1">Docs</helix-text>
        <helix-text as="p" class={styles.lede} tone="muted">
          Install it, theme it, and the ideas underneath. Every family's own API lives on its page
          under Components; these are the guides that cross families.
        </helix-text>
      </helix-flex>

      {/*
       * *Descriptions, which is what the sidebar cannot show.** Every page
       *           carries a one-line summary in its frontmatter, and without them the
       *           index is the navigation again in boxes: the same six sections and the
       *           same forty-two titles a reader already has two inches to the left, at
       *           3,838px of page. A card per section adds a border and an inset and no
       *           information.
       */}
      {navigation().map((section) => (
        <helix-flex class={styles.section} direction="column" gap="md" key={section.title}>
          <helix-text as="h2" variant="subheading">
            {section.title}
          </helix-text>
          <div className={styles.pages}>
            {section.pages.map((page) => (
              <Link className={styles.page} href={`/helix/docs/${page.slug}`} key={page.slug}>
                <helix-text class={styles.title} variant="body-strong">
                  {page.title}
                </helix-text>
                <helix-text as="span" class={styles.summary} variant="caption">
                  {page.description}
                </helix-text>
              </Link>
            ))}
          </div>
        </helix-flex>
      ))}
    </main>
  )
}
