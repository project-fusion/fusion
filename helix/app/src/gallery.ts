import type { ComponentType } from 'react'
import { FAMILIES } from './examples.generated'

/** One example, as the gallery lists it and runs it. */
export interface GalleryExample {
  /**
   * The source the sandbox shows, in runs of one color each: `[kind, text]`,
   * with an empty kind for plain text.
   */
  readonly code: readonly (readonly [string, string])[]
  /** What the example shows on a phone. */
  readonly description: string
  /** The web example, run as it is. */
  readonly Example: ComponentType
  /** The example's name. */
  readonly label: string
  /** The last part of the example's link. */
  readonly slug: string
  /** Whether the example imports a stylesheet, which only the web draws. */
  readonly styled: boolean
}

/** One family with a native version, as the gallery lists it. */
export interface GalleryFamily {
  /** Its styled examples, in the order the sandbox lists them. */
  readonly examples: readonly GalleryExample[]
  /** The family's name. */
  readonly label: string
  /** The first part of an example's link. */
  readonly slug: string
  /** One sentence on what the family is. */
  readonly summary: string
}

export { FAMILIES }

/** The family a link names, if the gallery has it. */
export const familyOf = (slug: string): GalleryFamily | undefined =>
  FAMILIES.find((family) => family.slug === slug)

/** The example a link names, if the gallery has it. */
export const exampleOf = (family: string, slug: string): GalleryExample | undefined =>
  familyOf(family)?.examples.find((example) => example.slug === slug)
