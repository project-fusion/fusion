/**
 * How large a note is drawn, in one place, so the drawing and a snapshot
 * drawn on the server agree.
 */

/**
 * **A note without a size is as large as it is connected**, so a hub reads as
 * one at a glance and the graph's shape shows before a word of it is read.
 * The square root, so a note with a hundred links is not ten times the size
 * of one with ten, and no larger than a note with thirty-six, so a hub with
 * thousands does not cover its own region.
 *
 * **A note with no links is as large as one with a single link.** Sized by its
 * none it drew a dot under 6 pixels across, in the muted ink of a note in no
 * group, which read as a speck on the ground and not as a note: a note alone
 * is still a note, and the reader came to the graph to find it.
 */
export const sizeOf = (size: number | undefined, links: number): number =>
  Number.isFinite(size) ? (size as number) : 1 + Math.min(Math.sqrt(Math.max(links, 1)), 6)

/** A note's drawn radius in pixels, from its relative size: a leaf about four, a busy hub about nine. */
export const pixelsOf = (size: number): number => 1.6 + 1.35 * Math.max(size, 0)
