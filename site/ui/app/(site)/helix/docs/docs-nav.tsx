'use client'

import type { DocNavSection } from '@helix-io/docs'
import { usePathname, useRouter } from 'next/navigation'
import { type MouseEvent as ReactMouseEvent, useCallback, useRef } from 'react'
import styles from '../components/docs.module.css'

/**
 * The documentation sidebar, from `navigation()`.
 *
 * **The ordering rule is the registry's, not this file's.** Sections arrive in
 * the order they are declared, a path in its declared order and everything else
 * pinned-entry-first then alphabetical, with children under their parent. This
 * renders what it is handed, which is what makes `check:docs` able to hold the
 * rule at all.
 *
 * **Collapsed except the first section and the ancestor of the current page**,
 * and decided here rather than after hydration. `usePathname` runs during the
 * server render of a client component, so `default-open` is in the HTML: a nav
 * that opened itself in an effect would paint collapsed and jump on every deep
 * link, which is the largest element on the page doing the exact thing
 * `server-rendering.mdx` documents.
 *
 * `default-open` and never `open`. `open` is the controlled half, and declaring
 * it would freeze a branch where a reader cannot collapse it.
 *
 * The link handling is the same as the component rail's, and for the same
 * reasons: rows stay real anchors so Enter, middle click and the status bar
 * work, with prefetch on approach rather than on sight.
 */

/* From the composed path rather than the target: the anchor is inside the
   item's shadow root, so by the time the event is out here it has retargeted to
   the host. */
const linkFrom = (event: { nativeEvent: Event }): HTMLAnchorElement | undefined =>
  event.nativeEvent
    .composedPath()
    .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)

const internal = (link: HTMLAnchorElement | undefined): string | undefined => {
  if (link?.target !== '') {
    return undefined
  }
  const url = new URL(link.href)
  return url.origin === window.location.origin ? `${url.pathname}${url.search}` : undefined
}

export function DocsNav({ sections }: { sections: readonly DocNavSection[] }) {
  const router = useRouter()
  const active = usePathname().split('/').pop() ?? ''
  const warmed = useRef(new Set<string>())

  const navigate = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const path = internal(linkFrom(event))
      if (path === undefined) {
        return
      }
      event.preventDefault()
      router.push(path)
    },
    [router],
  )

  const warm = useCallback(
    (event: { nativeEvent: Event }) => {
      const path = internal(linkFrom(event))
      if (path === undefined || warmed.current.has(path)) {
        return
      }
      warmed.current.add(path)
      router.prefetch(path)
    },
    [router],
  )

  /** Whether a section holds the page being read, or is the one that opens. */
  const opens = (section: DocNavSection, index: number) =>
    index === 0 ||
    section.pages.some(
      (page) => page.slug === active || page.children.some((child) => child.slug === active),
    )

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: delegates to real anchors
    <nav
      aria-label="Helix documentation"
      className={styles.docsNav}
      onClick={navigate}
      onFocus={warm}
      onPointerOver={warm}
    >
      <helix-tree active={active} chevron-placement="end" label="Helix documentation">
        {sections.map((section, index) => (
          <helix-tree-item
            key={section.title}
            suppressHydrationWarning
            value={`section-${section.title}`}
            {...(opens(section, index) ? { 'default-open': true } : {})}
          >
            {section.title}
            {section.pages.map((page) => (
              <helix-tree-item
                href={`/helix/docs/${page.slug}`}
                key={page.slug}
                slot="children"
                value={page.slug}
                {...(page.children.some((child) => child.slug === active)
                  ? { 'default-open': true }
                  : {})}
              >
                {page.title}
                {page.children.map((child) => (
                  <helix-tree-item
                    href={`/helix/docs/${child.slug}`}
                    key={child.slug}
                    slot="children"
                    value={child.slug}
                  >
                    {child.title}
                  </helix-tree-item>
                ))}
              </helix-tree-item>
            ))}
          </helix-tree-item>
        ))}
      </helix-tree>
    </nav>
  )
}
