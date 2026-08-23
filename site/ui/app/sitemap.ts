import type { MetadataRoute } from 'next'
import { routes } from '@/lib/routes'

/**
 * Every page, from the route registry.
 *
 * The registry is what makes this one line rather than a list somebody
 * maintains: a component family added to the library and a page added to
 * `@helix-io/docs` both appear here without anyone editing anything.
 *
 * The `.md` siblings are deliberately absent. They are alternates of the pages
 * rather than pages of their own, `rel="alternate"` says so on each page, and a
 * sitemap that listed both would claim the site is twice its size.
 */
export const dynamic = 'force-static'

const SITE = 'https://fusion.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  return routes().map((route) => ({
    priority: route.priority,
    url: `${SITE}${route.path === '/' ? '' : route.path}`,
  }))
}
