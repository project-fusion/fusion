/**
 * A fake image source for the conformance suite: a picture whose source says
 * how it answers, so a scenario holds a family that draws one to the same
 * load on each platform, with no network.
 *
 * **A fake source loads, fails, or hangs.** `fakeImage('loads')` is a
 * source that loads, `fails` one that fails, and `hangs` one that never
 * answers, so the element stays loading. Each half resolves the source its
 * own way: the web half sets the inner `<img>` to a picture that loads or
 * fails, or to no source (`web-images.ts`), and the native half draws a
 * picture that answers as its source says.
 */

/** How a fake source answers. */
export type ImageOutcome = 'fails' | 'hangs' | 'loads'

/** What every fake source starts with. */
export const FAKE_IMAGE = 'helix-fake-image:'

/**
 * A fake source that answers as `outcome` says. `name` tells two sources
 * of one outcome apart, so a scenario can set a new one.
 */
export const fakeImage = (outcome: ImageOutcome, name = 'picture'): string =>
  `${FAKE_IMAGE}${outcome}/${name}`

/** How a source answers, where it is a fake one. */
export const outcomeOf = (src: string): ImageOutcome | undefined => {
  if (!src.startsWith(FAKE_IMAGE)) {
    return undefined
  }
  const outcome = src.slice(FAKE_IMAGE.length).split('/')[0]
  return outcome === 'fails' || outcome === 'hangs' || outcome === 'loads' ? outcome : undefined
}
