import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type ApiMember, families, findFamily } from '../../../../lib/catalog'

/**
 * API reference for one family, read from the manifest and nothing else.
 *
 * Deliberately holds no examples. This page answers what a component can do;
 * the sandbox answers what it looks like. A reference that starts collecting
 * pictures stops being the place you can trust to be complete.
 */

export function generateStaticParams() {
  return families.map((family) => ({ family: family.slug }))
}

function Table({ caption, rows }: { caption: string; rows: ApiMember[] }) {
  if (rows.length === 0) {
    return null
  }
  return (
    <section className="apiSection">
      <h3>{caption}</h3>
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name || '(default)'}</code>
                {row.type && <span className="apiType">{row.type}</span>}
              </td>
              <td>{row.description.split('\n\n')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default async function FamilyDocs({ params }: { params: Promise<{ family: string }> }) {
  const family = findFamily((await params).family)
  if (!family) {
    notFound()
  }

  return (
    <div className="docsShell">
      {/* Families only. The examples belong to the sandbox, and listing them
          here is what made the two surfaces one confusing thing. */}
      <nav aria-label="Components" className="docsNav">
        {families.map((entry) => (
          <Link
            aria-current={entry.slug === family.slug ? 'page' : undefined}
            href={`/components/${entry.slug}`}
            key={entry.slug}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="page">
        <header className="pageHead">
          <h1>{family.label}</h1>
          <div className="chips">
            {family.status && <span className={`chip chip-${family.status}`}>{family.status}</span>}
            {family.since && <span className="chip">since {family.since}</span>}
          </div>
          {family.aliases.length > 0 && (
            <p className="aliases">Also known as {family.aliases.join(', ')}</p>
          )}
          <p className="lede">{family.summary}</p>
          {family.examples.length > 0 && (
            <p>
              <Link href={`/sandbox?family=${family.slug}&example=${family.examples[0]?.slug}`}>
                Open in the sandbox
              </Link>
            </p>
          )}
        </header>

        {family.elements.map((element) => (
          <article className="element" key={element.tagName}>
            <h2>
              {element.label} <span className="tierChip">{element.tier}</span>
            </h2>
            <code className="tagName">&lt;{element.tagName}&gt;</code>
            {element.description && <p className="description">{element.description}</p>}

            <Table caption="Attributes" rows={element.attributes} />
            <Table caption="Slots" rows={element.slots} />
            <Table caption="Parts" rows={element.cssParts} />
            <Table caption="CSS properties" rows={element.cssProperties} />

            {element.events.length > 0 && (
              <section className="apiSection">
                <h3>Events</h3>
                <table>
                  <tbody>
                    {element.events.map((event) => (
                      <tr key={event.name}>
                        <td>
                          <code>{event.name}</code>
                          <span className="apiType">{event.reactProp}</span>
                        </td>
                        <td>{event.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
