'use client'

import { usePlatform } from '@/hooks/use-platform/use-platform'

/**
 * The rail's links to the native sections, drawn only under the native
 * preference.
 *
 * **Rendered here, and never hidden by CSS as the page's sections are.**
 * `Outline` gives each link a list item in the accessibility tree, and a
 * hidden link keeps its item, so links hidden on the web would add an empty
 * item to every web page this family has. The first render is `web`, as the
 * server's is, so there is nothing to hydrate.
 */
export function NativeRail({ links }: { links: { id: string; label: string }[] }) {
  const platform = usePlatform()
  if (platform !== 'native') {
    return null
  }
  return links.map((link) => (
    <a data-level="2" href={`#${link.id}`} key={link.id}>
      {link.label}
    </a>
  ))
}
