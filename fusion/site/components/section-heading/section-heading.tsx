import type { ReactNode } from 'react'
import styles from './section-heading.module.css'

/**
 * A heading with the link that addresses the section it opens.
 *
 * **The link is what makes a section shareable**: with no anchor on a heading,
 * the only address a reader can send is the whole page. Prose headings had one
 * and the component reference pages did not, which is why it lives here rather
 * than in `prose`: the two build their sections differently and want the same
 * mark on top of them.
 *
 * `target` is what the link points at and `id` is what carries it, because
 * those are not always the same element. Prose puts the id on the heading, so
 * it passes both. A reference page wraps each section in a `helix-flex` that
 * already holds the id and the scroll offset the outline writes onto it, so it
 * passes `target` alone and the heading stays unaddressed.
 *
 * An anchor rather than `helix-icon-button`, which is a `button` and has no
 * `href`. What this is for is sending somebody the address, so it has to be a
 * real link: middle-click opens a tab, the context menu offers "copy link
 * address", and the status bar shows where it goes. None of that is reachable
 * from a button with a click handler. It takes the icon button's *appearance*
 * instead.
 *
 * `aria-hidden` on the mark and a label on the link, so a screen reader hears
 * "link, Section name" once rather than the heading text followed by a hash.
 */
export function SectionHeading({
  as,
  children,
  id,
  label,
  target,
}: {
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  children?: ReactNode
  /** Set only where the heading itself is the thing being addressed. */
  id?: string | undefined
  /** What a screen reader hears after "link to", where the children are not plain text. */
  label?: string | undefined
  /** The fragment the link points at, with no leading hash. */
  target: string
}) {
  return (
    <helix-text as={as} class={styles.heading} id={id || undefined}>
      {/* A heading whose text slugs to nothing has no address, so it gets no
          mark rather than a link to `#`. */}
      {target && (
        <a aria-label={`Link to ${label ?? target}`} className={styles.anchor} href={`#${target}`}>
          <helix-icon name="link"></helix-icon>
        </a>
      )}
      {children}
    </helix-text>
  )
}
