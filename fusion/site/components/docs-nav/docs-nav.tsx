'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type MouseEvent as ReactMouseEvent, useCallback, useRef } from 'react'
import { docsShell } from '@/components/docs-shell/docs-shell'
import type { NavEntry, NavSection } from '@/content/helix-nav/helix-nav'

/* The sidebar for everything under `/helix`, from `helixNavigation()`.
 *
 * **One component, not one per rail.** Two files rendering the same `helix-tree`
 * over different data is what let the docs and the component navigations drift
 * into being unreachable from one another. This renders whatever sections it is
 * handed and knows nothing about where they came from, which is what makes the
 * composition in `content/helix-nav/helix-nav.ts` the only place the shape is
 * decided.
 *
 * **A row's value is its path.** The last segment of a slug works only while no
 * component shares a name with a doc page, and the merged tree puts families and
 * prose pages in one value space. The path is what the tree is marking current
 * anyway, and it cannot collide.
 *
 * **Collapsed except the section holding the current page**, and the first
 * section only when no section holds it, which is the landing case. Opening the
 * first one unconditionally puts Getting started down beside Components on every
 * component page, so the rail opens with two branches and the one a reader
 * wanted is the lower of them.
 *
 * Decided here rather than after hydration. `usePathname` runs during the server
 * render of a client component, so `default-open` is in the HTML: a nav that
 * opened itself in an effect would paint collapsed and jump on every deep link,
 * which is the largest element on the page doing the exact thing
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
      className={docsShell.docsNav}
      onClick={navigate}
      onFocus={warm}
      onPointerOver={warm}
    >
      {/* `heading`, because every branch in this rail is the name of the list
          under it and none of them is a page. A section is a bucket, and a
          group row carries `group-<href>` precisely because its own page moved
          down to be its first child, so nothing here that holds rows is
          somewhere a reader can go.

          It replaces `subordinate`, which was one reading short. That value
          spends its single step on the first nesting and has nothing left for
          the second, so "Installation" came out at the size of "Angular"
          underneath it and only the indent said which held which. Under this
          one the branch changes at every depth and the pages stay at the size
          every other page is, which is the shape a reader of documentation
          already knows. */}
      <helix-tree
        active={pathname}
        chevron-placement="end"
        label="Helix documentation"
        nesting="heading"
      >
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
               * One row carrying an `href` *and* a chevron is ambiguous, and
               * `TreeItem` resolves it the only way it can: it toggles from
               * anywhere in the row when there is no `href`, and where there is
               * one the row navigates and only the chevron opens. Pressing
               * "Installation" then goes to the page and leaves the branch shut,
               * and a reader who wants its children has to find a fourteen-pixel
               * target.
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
                       * `active`, so a group carrying the href of the page it
                       * holds as a child lights at the same moment that child
                       * does: two rows for one destination, and the group is
                       * not a destination at all. It takes the same shape a
                       * section does. */
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
