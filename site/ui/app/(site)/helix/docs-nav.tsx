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
 * `default-open` and never `open`, because what this wants to say is where the
 * nav starts rather than where it is. Both seed, and `default-open` is the one
 * a reset returns to.
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
            {section.entries.map((entry) => {
              const children = entry.children ?? []
              /* **A row is a destination or a group, and never both.**
               *
               * A page with children used to be written as one row carrying an
               * `href` *and* a chevron, which made the row ambiguous and the
               * component resolve it the only way it could: `TreeItem` toggles
               * from anywhere in the row when there is no `href`, and where
               * there is one the row navigates and only the chevron opens. So
               * pressing "Installation" went to the page and left the branch
               * shut, and a reader who wanted its children had to find a
               * fourteen-pixel target.
               *
               * The page is still a page. It moves down a level as the group's
               * first child, so the group toggles from anywhere in its row and
               * the destination has a row of its own. Nothing is unreachable
               * that was reachable before, and one press does one thing.
               *
               * **"Overview" everywhere rather than a name per group.** "Any
               * framework" reads better over the installation pages and then
               * fails over the agent ones, and a reader learns one convention
               * once where they have to notice three. */
              const rows =
                children.length > 0
                  ? [{ href: entry.href, label: 'Overview' }, ...children]
                  : children
              return (
                <helix-tree-item
                  key={entry.href}
                  slot="children"
                  {...(children.length > 0
                    ? /* **A group's value is not its page's path.**
                       *
                       * `Tree` marks active whatever `value` matches its
                       * `active`, so a group that kept the href of the page it
                       * now holds as a child was selected at the same moment
                       * that child was: two rows lit for one destination, and
                       * the group is not a destination at all. It takes the
                       * same shape a section does. */
                      { value: `group-${entry.href}` }
                    : { href: entry.href, value: entry.href })}
                  {...(rows.some((row) => row.href === pathname) ? { 'default-open': true } : {})}
                >
                  {entry.label}
                  {rows.map((row) => (
                    <helix-tree-item
                      href={row.href}
                      key={row.href}
                      slot="children"
                      value={row.href}
                    >
                      {row.label}
                    </helix-tree-item>
                  ))}
                </helix-tree-item>
              )
            })}
          </helix-tree-item>
        ))}
      </helix-tree>
    </nav>
  )
}
