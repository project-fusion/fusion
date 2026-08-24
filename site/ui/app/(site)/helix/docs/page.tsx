import { navigation } from '@helix-io/docs'
import Link from 'next/link'
import styles from '../../vertical-page.module.css'

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
    <helix-flex class={styles.verticalShell} data-shell direction="column" gap="xl">
      <helix-flex direction="column" gap="sm">
        <helix-flex align="center" data-density="sm" gap="xs">
          <helix-tag>Helix</helix-tag>
        </helix-flex>
        <helix-text as="h1">Docs</helix-text>
        <helix-text as="p" class={styles.lede} tone="muted">
          Install it, theme it, and the ideas underneath. Every family's own API lives on its page
          under Components; these are the guides that cross families.
        </helix-text>
      </helix-flex>

      <helix-grid columns={2} gap="xl">
        {navigation().map((section) => (
          <helix-card key={section.title} separation="outlined">
            <helix-text as="h2" slot="header" variant="title">
              {section.title}
            </helix-text>
            <helix-list kind="unordered">
              {section.pages.map((page) => (
                <helix-list-item key={page.slug}>
                  <Link data-link="subtle" href={`/helix/docs/${page.slug}`}>
                    {page.title}
                  </Link>
                </helix-list-item>
              ))}
            </helix-list>
          </helix-card>
        ))}
      </helix-grid>
    </helix-flex>
  )
}
