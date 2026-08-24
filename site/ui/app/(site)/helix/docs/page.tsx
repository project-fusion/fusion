import { navigation } from '@helix-io/docs'
import Link from 'next/link'
import shell from '../components/(reference)/docs.module.css'
import styles from './docs-index.module.css'

/**
 * The guides index, which is a page now rather than a redirect.
 *
 * **It was `redirect()` to the first page of the first section**, on the
 * argument that a landing page in front of a table of contents is a click
 * between a reader and what they asked for. That argument was sound and it
 * rested on something that has since changed: it was only true because `/helix`
 * was the component gallery, so the documentation had no product page to be
 * part of and an index here would have been the only thing above it. `/helix`
 * is the overview now, so this is one section of a product rather than the
 * whole of it, and a reader arriving from the masthead's Docs row has asked
 * what the documentation covers rather than to be dropped into the first page
 * of the first section. See 189.
 *
 * The sections come from `navigation()`, which is the same call the sidebar
 * makes. Nothing about the shape of the documentation is written here: a
 * section added to `@helix-io/docs` appears without this file being touched,
 * which is the property the registry exists to have.
 */
export const metadata = {
  description: 'Install it, theme it, and the ideas underneath.',
  title: 'Docs',
}

export default function DocsIndex() {
  return (
    /* **`docsMain`, not the vertical product shell.** This wore
       `vertical-page.module.css`, whose `padding-block: var(--site-band)` is the
       marketing band inset that `/helix` and `/cortex` need because they have no
       chrome above them. Inside the docs layout, which already pads 48px below
       the header, the two stacked: the index's title sat at 249 where every page
       it links to starts at 134, and 108px below its own sidebar. An index that
       does not line up with its siblings reads as a different kind of page. */
    <main className={shell.docsMain}>
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

      {/* **Descriptions, which is what the sidebar cannot show.** Every page
          carries a one-line summary in its frontmatter and this rendered none of
          them, so the index was the navigation again in boxes: the same six
          sections and the same forty-two titles a reader already had two inches
          to the left, at 3,838px of page. A card per section added a border and
          an inset and no information.

          The sections flow rather than sitting in a grid of equal-height cards,
          because they have six, seven, ten and eleven pages: any row of two
          leaves one of them padded to the other's height, which is the void this
          page opened with and is a shape the content will keep producing. */}
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
