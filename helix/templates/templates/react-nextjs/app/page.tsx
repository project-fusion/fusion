import { Landing } from './landing'

/**
 * The page a scaffold opens on, and a server component like the two beside it.
 *
 * Nothing here has a handler, so nothing here is marked `'use client'`. That is
 * the line in an App Router project and it is not about Helix: the elements are
 * registered once from the layout, and an unregistered tag in the served HTML is
 * only an unknown element, which upgrades the moment the definition lands.
 */
export default function Page() {
  return <Landing />
}
