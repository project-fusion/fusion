'use client'

import { usePathname, useRouter } from 'next/navigation'
import { type MouseEvent as ReactMouseEvent, useCallback, useRef } from 'react'
import styles from '../docs.module.css'

/** One entry in the sidebar: what it is called and where it goes. */
export interface DocsNavEntry {
  /** The name shown on the row. */
  label: string
  /** The family's slug, which is also the last segment of its path. */
  slug: string
}

/**
 * The documentation sidebar, as real links with Next's routing over the top.
 *
 * **Why not a `<Link>` per row.** `href` on the item makes the row itself an
 * `<a>`, which is what gives the whole row a target, Enter, middle-click and
 * the status bar. A `<Link>` cannot be that anchor: it renders its own, with
 * its own handlers, and there is nowhere to hand it to an element that renders
 * one inside a shadow root.
 *
 * **Why not wrap each item in a `<Link>` instead.** It very nearly works, and
 * the tree would still find its items, since it collects them with a descendant
 * query. What it costs is two focusable elements per row where the tree owns a
 * single roving tab stop, a `treeitem` nested inside a `link` for anything
 * reading the semantics, and nothing at all for a branch: a branch contains its
 * children, so wrapping one puts every descendant anchor inside an ancestor
 * anchor, which is invalid and which browsers rearrange.
 *
 * So the rows stay anchors and this adds back the two things `<Link>` was there
 * for. Prefetching happens on approach rather than on sight, which for a list
 * of seventy is the difference between one request and seventy: a reader points
 * at a row long before they press it, and that is enough warning.
 *
 * Only a plain primary press is taken. A modified or middle press is exactly
 * the gesture that wants the browser's own behaviour, and intercepting it would
 * take back the thing real anchors were for.
 */
/* From the composed path rather than the target: the anchor is inside the
   item's shadow root, so by the time the event reaches a handler out here it has
   retargeted to the host and `event.target` is the custom element. */
const linkFrom = (event: { nativeEvent: Event }): HTMLAnchorElement | undefined =>
  event.nativeEvent
    .composedPath()
    .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)

/** The path, or nothing where the link leaves the site or opens elsewhere. */
const internal = (link: HTMLAnchorElement | undefined): string | undefined => {
  if (link?.target !== '') {
    return undefined
  }
  const url = new URL(link.href)
  return url.origin === window.location.origin ? `${url.pathname}${url.search}` : undefined
}

export function DocsNav({ entries }: { entries: readonly DocsNavEntry[] }) {
  const router = useRouter()
  /* Read rather than taken as a prop, because the layout rendering this sits
     above the `[family]` segment and is therefore not handed one: that is what
     makes it survive a navigation between families, which is the whole reason
     the rail lives there. A navigation knowing which route it is on is not a
     burden on it. */
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

  return (
    /* On the nav rather than on the tree, so one listener covers every row and
       nothing has to be bound as rows come and go with a branch. `pointerover`
       rather than `pointerenter`, because only the first bubbles and the rows
       are what is being pointed at.
       The click rule below is about a handler standing in for a control. This
       one delegates to real anchors, which answer Enter themselves, so a
       keyboard handler here would either do nothing or navigate twice. */
    // biome-ignore lint/a11y/useKeyWithClickEvents: delegates to real anchors
    <nav
      aria-label="Documentation"
      className={styles.docsNav}
      onClick={navigate}
      onFocus={warm}
      onPointerOver={warm}
    >
      <helix-tree active={active} chevron-placement="end" label="Documentation">
        {/* `default-open`, not `open`. `open` is the controlled half of
            `MixinControllerOpen`, and setting it declares the consumer owns the
            state: the branch would freeze open and a reader could not collapse
            it. Seeding is what markup is for. */}
        <helix-tree-item default-open suppressHydrationWarning value="components">
          Components
          {/* The way back to the index, and the only one in this rail since the
              wordmark went home.

              **A row, not a mark on the branch.** It was a small hover-revealed
              button in the branch's `end` slot, which put a navigation
              affordance behind a pointer and beside a chevron, where it read as
              a second toggle. A destination in a list of destinations is a row
              in that list: it is in the tab order without a rule saying so, it
              is legible without hovering anything, and it needs no tooltip to
              say what it does because it says what it does.

              First, because it is the whole of what the rows under it are part
              of, and `value="all"` matches no family so it is never marked
              current on a component's page. */}
          <helix-tree-item href="/helix" slot="children" value="all">
            All Components
          </helix-tree-item>
          {entries.map((entry) => (
            <helix-tree-item
              href={`/helix/components/${entry.slug}`}
              key={entry.slug}
              slot="children"
              value={entry.slug}
            >
              {entry.label}
            </helix-tree-item>
          ))}
        </helix-tree-item>
      </helix-tree>
    </nav>
  )
}
