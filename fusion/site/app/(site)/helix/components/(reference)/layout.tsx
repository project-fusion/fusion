import { helixNavigation } from '@/content/helix-nav/helix-nav'
import { DocsNav } from '../../docs-nav'
import styles from './docs.module.css'

/**
 * The shell every component page sits in, and the rail that outlives them.
 *
 * **A layout because the nav has state a reader owns.** Rendered from the page,
 * Next tears it down and builds it again on every navigation between families,
 * so a reader who collapsed the Components branch finds it open again the moment
 * they open a component: the element they collapsed no longer exists and its
 * replacement is seeded `default-open` like any other. The branch does close, it
 * just cannot stay closed, which is why clicking the chevron always looks fine.
 * A layout stays mounted across the routes it wraps, so the tree keeps its
 * identity and nothing has to be stored, which is the version that would need a
 * boot script to avoid a flash of the wrong state. See (119).
 *
 * **Above the dynamic segment, which is the half that matters.** A layout inside
 * `[family]` is keyed by the value of that segment, so a different family is a
 * different instance and the tree is rebuilt exactly as before. One directory up
 * it wraps every family and none of them.
 *
 * That is also why `DocsNav` reads the route itself rather than taking a prop:
 * this layout is not handed the family, because not being handed it is the
 * whole point. A navigation knowing where it is, is not a burden on it.
 *
 * **`(reference)` is a route group, which is what keeps the index out of this
 * shell.** The gallery at `/helix/components` sits in the same directory as the
 * family pages, so without the group this layout catches it and the index of 89
 * cards renders inside a documentation sidebar in a narrow column. Putting the
 * layout inside `[family]` is not the fix and the paragraph above says why. A
 * group has no URL of its own, so `/helix/components/button` is unchanged and
 * the layout wraps every family and nothing else.
 */
export default function ComponentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.docsShell}>
      <DocsNav sections={helixNavigation()} />
      {children}
    </div>
  )
}
