import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findFamily } from '@/content/catalog/catalog'
import { findNative, getNativeFamilies } from '@/content/native/native'
import { pageMetadata } from '@/utils/metadata/metadata'
import { OpenInExpoGo } from './open-in-expo-go'

/* The page the sandbox's "View on your phone" code opens: one example of a
   family Helix draws on React Native, sent on to the gallery in Expo Go.

   **A phone without Expo Go stays here**, since the link into it goes nowhere,
   so the page says where to get it. */

/** The site's own host in production, where the gallery is served. */
const PRODUCTION = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'fusion.dev'

/** The example and its family, where the family has a React Native version. */
const find = (family: string, example: string) => {
  const found = findNative(family) && findFamily(family)
  const listed = found?.examples.find((one) => one.tier === 'styled' && one.slug === example)
  return found && listed ? { family: found, listed } : undefined
}

export function generateStaticParams() {
  return getNativeFamilies().flatMap((native) =>
    (findFamily(native.slug)?.examples ?? [])
      .filter((one) => one.tier === 'styled')
      .map((one) => ({ example: one.slug, family: native.slug })),
  )
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ example: string; family: string }>
}) {
  const { example, family } = await params
  const found = find(family, example)
  return pageMetadata({
    description: 'One Helix example, drawn on your phone in Expo Go.',
    path: `/helix/app/open/${family}/${example}`,
    title: found ? `${found.family.label}, ${found.listed.label}, in Expo Go` : 'Helix in Expo Go',
  })
}

export default async function Page({
  params,
}: {
  params: Promise<{ example: string; family: string }>
}) {
  const { example, family } = await params
  const found = find(family, example)
  if (!found) {
    notFound()
  }
  return (
    <section data-band>
      <helix-flex data-shell direction="column" gap="lg">
        <helix-text emphasis="muted" variant="label">
          Helix gallery
        </helix-text>
        <helix-text as="h1" data-measure data-section-title>
          {found.family.label}, {found.listed.label}
        </helix-text>
        <helix-text as="p" data-measure emphasis="muted">
          The example opens in the Helix gallery in Expo Go, on a phone.
        </helix-text>
        <OpenInExpoGo
          example={example}
          fallback={`exps://${PRODUCTION}/helix/app/--/${family}/${example}`}
          family={family}
        />
        {/* In a box of its own, so the column does not stretch the button to its width. */}
        <div data-density="lg">
          <Link data-button="subtle" href={`/helix/components/${family}`}>
            {found.family.label} reference
          </Link>
        </div>
      </helix-flex>
    </section>
  )
}
