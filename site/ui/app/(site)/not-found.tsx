import { NotFoundBody } from '@/components/trouble/trouble'

/**
 * The 404 for `notFound()` thrown inside the site.
 *
 * `/insights/[slug]` and `/helix/components/[family]` call it for a name that is
 * not in the registry. Being in the group, this renders under the nav and above
 * the footer, so a reader who followed a stale link keeps the search and the
 * whole of the navigation.
 *
 * `NotFoundBody` explains why the root file also exists.
 */
export default function SiteNotFound() {
  return <NotFoundBody />
}
