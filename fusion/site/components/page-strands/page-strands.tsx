'use client'
import { useMotion } from '@/hooks/use-motion/use-motion'

/**
 * The strand down the landing page, which holds still when the reader turns
 * motion off in the preferences drawer.
 *
 * **A setting the reader can reach from every page**, because the strand moves
 * on its own for as long as the page is open, and moving content of that kind
 * needs a way to stop it (WCAG 2.2.2). The device's reduced-motion setting
 * stills it too, inside the element itself. Still, it follows the scroll.
 */
export function PageStrands({ className }: { className: string }) {
  const motion = useMotion()
  return (
    <helix-strands
      class={className}
      dust={1.3}
      quiet="hero-words"
      speed={motion === 'off' ? 0 : 1.2}
      travel
    >
      <helix-strands-stop at={0.9} for="problem-card" variant="sweep"></helix-strands-stop>
      <helix-strands-stop for="proof" variant="waves"></helix-strands-stop>
      <helix-strands-stop for="close" variant="waves"></helix-strands-stop>
    </helix-strands>
  )
}
