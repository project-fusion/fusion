import Link from 'next/link'
import { families } from '../lib/catalog'

/**
 * Every family, with its examples nested underneath.
 *
 * A server component: the catalog is read at build time and the sidebar has no
 * state of its own, so none of this needs to reach the browser.
 */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/">
        <strong>Helix</strong>
        <span>sandbox</span>
      </Link>

      <nav aria-label="Components">
        {families.map((family) => (
          <div className="navGroup" key={family.slug}>
            <Link className="navFamily" href={`/components/${family.slug}`}>
              {family.label}
            </Link>
            {family.examples.length > 0 && (
              <div className="navExamples">
                {family.examples.map((example) => (
                  <Link
                    className="navExample"
                    href={`/components/${family.slug}/${example.slug}`}
                    key={example.slug}
                  >
                    {example.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
