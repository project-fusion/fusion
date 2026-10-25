import type { Metadata } from 'next'
import { ProofPage } from './proof-page'

export const metadata: Metadata = {
  description:
    'A project dashboard written once from Helix components, drawn here on the web and natively in the Helix gallery on a phone.',
  robots: { follow: false, index: false },
  title: 'Proof page',
}

/**
 * The proof page on the web: the project dashboard in `helix/app/proof`, which
 * the gallery draws on a phone from the same source.
 *
 * **A group of its own, with no site chrome**, as the page is the app's whole
 * screen in the gallery. The frame around it is the web's alone, so it lives
 * here and the page names no platform.
 */
export default function Page() {
  return <ProofPage />
}
