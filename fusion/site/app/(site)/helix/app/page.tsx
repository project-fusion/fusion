import Link from 'next/link'
import { pageMetadata } from '@/utils/metadata/metadata'

/**
 * What a browser gets at the gallery's address. Expo Go gets a manifest at
 * the same address, by the `expo-platform` header it sends: the rewrite and
 * the headers are in `next.config.ts`, the gallery in `public/helix/app`.
 */
export const metadata = pageMetadata({
  description: 'Each Helix component with a React Native version, drawn on your phone in Expo Go.',
  path: '/helix/app',
  title: 'Helix gallery for phones',
})

export default function Page() {
  return (
    <section data-band>
      <helix-flex data-shell direction="column" gap="lg">
        <helix-text emphasis="muted" scale="label">
          Helix gallery
        </helix-text>
        <helix-text as="h1" data-measure data-section-title>
          Helix components on your phone
        </helix-text>
        <helix-text as="p" data-measure emphasis="muted">
          The gallery shows each component with a React Native version, with its examples, in Expo
          Go.
        </helix-text>
        <helix-flex data-density="lg" gap="sm" wrap>
          <a data-button="solid" data-button-tone="primary" href="https://expo.dev/go">
            Install Expo Go
          </a>
          <Link data-button="subtle" href="/helix/components">
            Browse the components
          </Link>
        </helix-flex>
      </helix-flex>
    </section>
  )
}
