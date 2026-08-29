import { docSources, findPage, navigation, pages } from '@fusion.dev/helix-docs'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageOutline } from '@/components/page-outline/page-outline'
import { pageMetadata } from '@/utils/metadata/metadata'
import { outlineOf } from '@/utils/outline/outline'
import { renderMdx } from '../../../../../utils/mdx/mdx'
import styles from '../../components/(reference)/docs.module.css'
import prose from '../docs-prose.module.css'

/**
 * One documentation page.
 *
 * The body is MDX compiled at build, the same way `/thesis` and the essays are,
 * and the source arrives as a string from the package rather than as a path,
 * because a content package that read the filesystem would put back the file
 * tracing this app does without.
 */
export function generateStaticParams(): { slug: string }[] {
  return pages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const page = findPage((await params).slug)
  return page
    ? pageMetadata({
        description: page.description,
        path: `/helix/docs/${page.slug}`,
        title: page.title,
      })
    : {}
}

/** The section a page is in, for the line above its title. */
const sectionOf = (slug: string) =>
  navigation().find((section) =>
    section.pages.some(
      (page) => page.slug === slug || page.children.some((child) => child.slug === slug),
    ),
  )?.title

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = findPage(slug)
  const source = docSources[slug]
  if (!page || !source) {
    notFound()
  }

  /* From the source rather than the registry: see the note on `outlineOf`. The
     docs shell already lays out three columns and this page filled two, so the
     rail lands in a track that was standing empty beside every prose page while
     the reference next door had one. */
  const outline = outlineOf(source)

  return (
    <>
      <main className={styles.docsMain}>
        {/* The section, and then the document.
          
          **The page does not render the title, because the document already
          does.** Every one of these files opens with its own `# Heading`, which
          is what a reader of `/helix/docs/tokens.md` gets, and stripping it
          here would make the page and the document disagree about where the
          page begins. Rendering both put the same words on screen twice and put
          two `h1` elements on the page, which is worse than untidy.
          
          `description` is not shown either. It is a one-line summary for the
          sidebar, the metadata and `llms.txt`, and every page's own first
          paragraph is the sentence a reader wants under the title. */}
        <helix-text tone="subtle" variant="label">
          {sectionOf(slug)}
        </helix-text>

        <div className={prose.prose} data-prose>
          {await renderMdx(source)}
        </div>
      </main>

      <aside className={styles.docsRail}>
        <PageOutline className={styles.docsRailTitle} entries={outline} />
      </aside>
    </>
  )
}
