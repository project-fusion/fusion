import { AuraLab } from './aura-lab'
import './aura.css'
import { pageMetadata } from '@/utils/metadata/metadata'

export const metadata = pageMetadata({
  description:
    'Nine backgrounds drawn from the token layer, with the pointer response and every parameter live.',
  path: '/helix/aura',
  title: 'Aura',
})

/**
 * The Aura playground.
 *
 * **A page rather than a preview.** This began under `/preview` as a bench for
 * choosing a hero background, which is a decision that has been made: braid, at
 * a derived tilt. What is left is the more useful thing, which is the component
 * itself with every axis exposed, and that belongs at a real address under the
 * product it is part of.
 *
 * `/helix/components/aura` stays and is the reference: the API tables read from
 * the manifest. This is the other half a reader wants, which is the thing
 * running at full size with the controls in reach.
 */
export default function Page() {
  return <AuraLab />
}
