import Link from 'next/link'
import { notFound } from 'next/navigation'
import { families, findFamily } from '../../../../lib/catalog'
import { SandboxStage } from '../../../sandbox-stage'

/**
 * One example, editable, beside its live preview.
 *
 * The sandbox showcases; the family's API page documents. Keeping them apart
 * means neither has to be a worse version of the other.
 */

export function generateStaticParams() {
  return families.flatMap((family) =>
    family.examples.map((example) => ({ example: example.slug, family: family.slug })),
  )
}

export default async function ExampleSandbox({
  params,
}: {
  params: Promise<{ example: string; family: string }>
}) {
  const { example: exampleSlug, family: familySlug } = await params
  const family = findFamily(familySlug)
  const example = family?.examples.find((entry) => entry.slug === exampleSlug)
  if (!family || !example) {
    notFound()
  }

  return (
    <div className="page">
      <header className="pageHead">
        <p className="crumb">
          <Link href={`/components/${family.slug}`}>{family.label}</Link>
        </p>
        <h1>{example.label}</h1>
        <p className="lede">{family.summary}</p>
      </header>

      {family.examples.length > 1 && (
        <nav aria-label="Examples" className="exampleTabs">
          {family.examples.map((entry) => (
            <Link
              aria-current={entry.slug === example.slug ? 'page' : undefined}
              href={`/components/${family.slug}/${entry.slug}`}
              key={entry.slug}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
      )}

      <SandboxStage html={example.html} />
    </div>
  )
}
