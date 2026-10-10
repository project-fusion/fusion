'use client'
import { useMotion } from '@/hooks/use-motion/use-motion'

/**
 * The strand down the Helix page: the DNA's light, the one the landing page
 * runs, quiet behind the hero's words and pinned to this page's own bands.
 *
 * Its own element and not the landing's `PageStrands`, because the stops name
 * the bands they pin to by id, and this page has its own. It holds still when
 * the reader turns motion off in the preferences drawer, and the device's
 * reduced-motion setting stills it inside the element itself.
 */
export function HelixStrands({ className }: { className: string }) {
  const motion = useMotion()
  return (
    <helix-strands
      class={className}
      dust={1.3}
      quiet="helix-hero-words"
      speed={motion === 'off' ? 0 : 1.2}
      travel
    >
      <helix-strands-stop at={0.9} for="helix-places" variant="sweep"></helix-strands-stop>
      <helix-strands-stop for="close" variant="waves"></helix-strands-stop>
    </helix-strands>
  )
}
