import { getFamilies } from '../../../../lib/catalog'
import { DocsNav } from './[family]/docs-nav'

/**
 * The shell every component page sits in, and the rail that outlives them.
 *
 * **A layout because the nav has state a reader owns.** It rendered from the
 * page, so Next tore it down and built it again on every navigation between
 * families: a reader who collapsed the Components branch found it open again
 * the moment they opened a component, because the element they collapsed no
 * longer existed and its replacement was seeded `default-open` like any other.
 * Measured, closing it and clicking Card: `open` false, then a different
 * element with `open` true.
 *
 * That is what #119 was, reported twice as "the branch will not close". It does
 * close. It could not stay closed, and the distinction is why six paths of
 * clicking the chevron all looked fine.
 *
 * A layout is the framework's own answer: it stays mounted across the routes it
 * wraps, so the tree keeps its identity and the state a reader set stays set.
 * Nothing had to be stored to achieve it, which is the version of this that
 * would have needed a boot script to avoid a flash of the wrong state.
 *
 * It also stops rebuilding eighty-eight rows on every navigation, which was
 * never the complaint and is the same fact from the other side.
 *
 * **Above the dynamic segment, which is the half that matters.** Put inside
 * `[family]` it remounted anyway: a layout in a dynamic segment is keyed by the
 * value of that segment, so a different family is a different instance and the
 * tree was rebuilt exactly as before. Measured, and it looked identical to the
 * bug it was meant to fix. One directory up it wraps every family and none of
 * them, so it stays.
 *
 * That is also why `DocsNav` reads the route itself rather than taking a prop:
 * this layout is not handed the family, because not being handed it is the
 * whole point. A navigation knowing where it is, is not a burden on it.
 */
export default function ComponentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docsShell">
      <DocsNav entries={getFamilies()} />
      {children}
    </div>
  )
}
