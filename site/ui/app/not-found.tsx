import { NotFoundBody } from '@/components/trouble/trouble'

/**
 * The 404 for an address that matched no route at all.
 *
 * This is the one a mistyped URL reaches. It renders inside the root layout, so
 * it has the fonts, the theme script and the global stylesheet, and it does not
 * have the nav or the footer: those belong to `(site)`, which a URL matching
 * nothing never enters. The links in the body are the way out for that reason.
 *
 * `NotFoundBody` explains why its twin under `(site)` also exists.
 */
export default function NotFound() {
  return <NotFoundBody />
}
