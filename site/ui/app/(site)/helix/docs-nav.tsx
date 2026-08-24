'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type MouseEvent as ReactMouseEvent, useCallback, useRef } from 'react'
import type { NavEntry, NavSection } from '@/content/helix-nav/helix-nav'
import styles from './components/(reference)/docs.module.css'

/**
 * The sidebar for everything under `/helix`, from `helixNavigation()`.
 *
 * **One component where there were two.** The docs rail and the component rail
 * were separate files rendering the same `helix-tree` with the same link
 * handling over different data, which is what let the two navigations drift
 * into being unreachable from one another. This renders whatever sections it is
 * handed and knows nothing about where they came from, which is what makes the
 * composition in `lib/helix-nav.ts` the only place the shape is decided.
 *
 * **A row's value is its path.** It was the last segment of the slug, which
 * works only while no component shares a name with a doc page, and the merged
 * tree puts eighty-nine families next to forty-one pages in one value space.
 * The path is what the tree is marking current anyway, and it cannot collide.
 *
 * **Collapsed except the section holding the current page**, and the first
 * section only when no section holds it, which is the landing case. Opening the
 * first one unconditionally put Getting started down beside Components on every
 * component page, so the rail opened with two branches and the one a reader
 * wanted was the lower of them. Decided here rather than after hydration. `usePathname` runs during the
 * server render of a client component, so `default-open` is in the HTML: a nav
 * that opened itself in an effect would paint collapsed and jump on every deep
 * link, which is the largest element on the page doing the exact thing
 * `server-rendering.mdx` documents.
 *
 * `default-open` and never `open`. `open` is the controlled half of
 * `MixinControllerOpen`, and declaring it would freeze a branch where a reader
 * cannot collapse it. Seeding is what markup is for.
 *
 * Rows stay real anchors, so Enter, middle click and the status bar work, with
 * Next's routing over the top and prefetch on approach rather than on sight:
 * for a list of a hundred and thirty that is the difference between one request
 * and a hundred and thirty.
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

/** Whether this row, or anything under it, is the page being read. */
const holds = (entry: NavEntry, path: string): boolean =>
  entry.href === path || (entry.children ?? []).some((child) => child.href === path)

export function DocsNav({ sections }: { sections: readonly NavSection[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const warmed = useRef(new Set<string>())

  const held = sections.findIndex((section) =>
    section.entries.some((entry) => holds(entry, pathname)),
  )
  const opened = held === -1 ? 0 : held

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

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: delegates to real anchors
    <nav
      aria-label="Helix documentation"
      className={styles.docsNav}
      onClick={navigate}
      onFocus={warm}
      onPointerOver={warm}
    >
      <helix-tree active={pathname} chevron-placement="end" label="Helix documentation">
        {sections.map((section, index) => (
          <helix-tree-item
            key={section.title}
            suppressHydrationWarning
            value={`section-${section.title}`}
            {...(index === opened ? { 'default-open': true } : {})}
          >
            {section.title}
            {section.entries.map((entry) => (
              <helix-tree-item
                href={entry.href}
                key={entry.href}
                slot="children"
                value={entry.href}
                {...((entry.children ?? []).some((child) => child.href === pathname)
                  ? { 'default-open': true }
                  : {})}
              >
                {entry.label}
                {(entry.children ?? []).map((child) => (
                  <helix-tree-item
                    href={child.href}
                    key={child.href}
                    slot="children"
                    value={child.href}
                  >
                    {child.label}
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
