import type { Metadata } from 'next'
import { absolute, SITE } from '@/utils/site/site'

/**
 * One shape for a page's title, its description, and everything that follows.
 *
 * **Eighty-nine routes shared one title and none of them said anything else.**
 * Measured for 247: zero `og:` tags across the site, no `metadataBase`, no
 * favicon. A link to any page of it, pasted anywhere a link gets unfurled,
 * produced the domain and nothing more, and a component family that has a name,
 * a summary and a stage looked identical to the contact form.
 *
 * **The point of a helper rather than a convention is that the second half is
 * derived.** A page states the two things only it knows, what it is called and
 * what it is about, and the canonical URL, the Open Graph block and the Twitter
 * card fall out. Written per page they would be four places to forget, and the
 * one that gets forgotten is always the card, because nothing on the page looks
 * wrong when it is missing.
 *
 * `metadataBase` is set once on the root layout, so every relative image here
 * resolves against the real origin rather than being dropped.
 */
export interface PageMeta {
  /** What the page is about, in one sentence. Used as the description and the card's. */
  description: string
  /**
   * The card's image, absolute or rooted, or `false` to stand aside.
   *
   * Absent takes the site card, which is the honest default: a page with no
   * picture of its own should not borrow one that is about something else.
   *
   * **`false` is for a route that ships an `opengraph-image` file**, and it
   * exists because setting `images` at all is what silences that file: Next
   * fills the block in from the convention only when nothing else has. Naming
   * the file's own URL instead does not work and looks like it does. Next
   * appends a content hash to an image route, so the built path is
   * `/helix/components/[family]/opengraph-image-1czn6t`, and a hand-written
   * `/helix/components/accordion/opengraph-image` is a 404 that no page renders
   * and no test visits.
   */
  image?: string | false
  /** The canonical path, leading slash, no origin. */
  path: string
  /** The page's own title, without the site suffix the template adds. */
  title: string
  /**
   * `article` for a piece of writing with a date, `website` for everything else.
   *
   * The default is `website` because most of this site is pages rather than
   * posts, and calling a component reference an article would be a claim about
   * authorship that nothing here makes.
   */
  type?: 'article' | 'website'
}

/** The card every page falls back to. */
export const SITE_CARD = '/opengraph-image'

/** A page's metadata, from the two facts only that page knows. */
export const pageMetadata = ({
  description,
  image = SITE_CARD,
  path,
  title,
  type = 'website',
}: PageMeta): Metadata => {
  const url = absolute(path)
  /* Omitted entirely rather than set to something empty, which is the whole
     mechanism: an `images` key that is present, whatever it holds, is Next's
     signal that this page has already decided, and the `opengraph-image` file
     beside the route is never consulted. */
  const images = image === false ? {} : { images: [{ url: image }] }
  return {
    alternates: { canonical: url },
    description,
    openGraph: { description, ...images, siteName: 'Fusion', title, type, url },
    title,
    twitter: { card: 'summary_large_image', description, ...images, title },
  }
}

/** The origin, for anything that needs it as a `URL` rather than a string. */
export const siteUrl = new URL(SITE)
