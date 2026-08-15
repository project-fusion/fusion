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
 * **The name is set at the title ramp, because below it the display face does
 * nothing.** It was `body-strong`, fifteen pixels, and the report was that the
 * brand font was not being applied at all. It was: the slotted text computes
 * Funnel Display and the face is loaded. It just cannot be told from Geist at
 * that size, which is the same complaint with a different cause and no better
 * an outcome. Set the two side by side at fifteen pixels in caps and they are
 * within six pixels across the whole word; at eighteen the geometric `S` and
 * the flat-sided `U` are plainly a different face. A display face that is
 * indistinguishable is a dependency carrying no weight, so either the type gets
 * big enough to earn it or it should not be here at all.
 *
 * Capitals, because a wordmark is read as a shape rather than as letters, and
 * the extra tracking is what stops the caps from crowding.
 *
 * `title` is empty on the mark: the name beside it is the accessible one, so the
 * mark is decoration rather than a second reading of the same word.
 */
export function Wordmark({ size = '1.5rem' }: { size?: string }) {
  return (
    <helix-flex align="center" gap="xs" inline>
      <FusionLogo size={size} title="" />
      <helix-text appearance="title" class="wordmark">
        Fusion
      </helix-text>
    </helix-flex>
  )
}
