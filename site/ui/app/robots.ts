import type { MetadataRoute } from 'next'
import { SITE } from '@/utils/site/site'

/**
 * Open, and pointing at the index.
 *
 * There is no crawler allowlist and no model opt-out here, which is a decision
 * rather than an omission: a site arguing that its meaning should be legible
 * without a rendering engine does not then ask machines not to read it.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: '/', userAgent: '*' }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
