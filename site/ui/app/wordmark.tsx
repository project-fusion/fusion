import { FusionLogo } from './fusion-logo'

/**
 * The Fusion lockup: the mark and the name, set together.
 *
 * One component because it was two. The site header and the sandbox header each
 * assembled the same three pieces by hand, and they had drifted: a `1.5rem` mark
 * beside a `1.25rem` one, and `xs` between mark and name beside `2xs`. Neither
 * was a decision, and nothing would have caught it, because two headers that
 * look nearly the same look fine until they are seen one after the other. A
 * lockup is a fixed relationship between a mark and a name, so the way to keep
 * it fixed is to have one of it.
 *
 * **The name carries no `appearance`.** Its type is set in `site.css`, where
 * the note explains why it is mixed case and why it is the size it is: the
 * display face was twice reported as not being applied, and both times it was,
 * and both times there was nothing of it left to see. This is a brand lockup
 * rather than a step in the type scale, so it does not borrow one.
 *
 * `title` is empty on the mark: the name beside it is the accessible one, so the
 * mark is decoration rather than a second reading of the same word.
 */
export function Wordmark({ size = '1.5rem' }: { size?: string }) {
  return (
    <helix-flex align="center" gap="xs" inline>
      <FusionLogo size={size} title="" />
      <helix-text class="wordmark">Fusion</helix-text>
    </helix-flex>
  )
}
