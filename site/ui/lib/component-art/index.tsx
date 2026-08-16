import type { ReactNode } from 'react'
import { contentArt } from './content'
import { coreArt } from './core'
import { formsArt } from './forms'
import { overlaysArt } from './overlays'

/**
 * Abstract art for a family's gallery card, keyed by slug.
 *
 * Every family in `helix/web/src` has an entry, and the four files are split by
 * kind rather than by anything the build cares about: one file of forty-nine is
 * hard to navigate and every entry would sit beside a neighbour it has nothing
 * to do with. The system they all obey is documented at the top of `core.tsx`.
 *
 * A slug with no entry renders nothing rather than a placeholder. Card's media
 * region is a bare `<slot>`, so an unassigned one generates no box at all: no
 * grid row, no gap, no empty inset band. A new family therefore gets a card
 * that simply has no picture, and looks deliberate until someone draws one.
 */
const art: Record<string, ReactNode> = {
  ...contentArt,
  ...coreArt,
  ...formsArt,
  ...overlaysArt,
}

/**
 * The card art for one family.
 *
 * `aria-hidden`, deliberately. The card already carries the family's name as a
 * heading and its summary as prose, so a description of the picture would be a
 * third telling of the same thing. "Three rounded rectangles offset diagonally"
 * is noise to anyone who cannot see it and has just been told this is Button.
 *
 * The `slot` is here rather than on the call site because the wrapper is here:
 * slot assignment reads the light-DOM element, so the attribute has to land on
 * the `<svg>` itself.
 *
 * No background, no border and no radius of its own. The media region runs edge
 * to edge inside the card and the card's `overflow: hidden` clips it to the
 * corner, so anything stated here would be a second frame inside the first.
 */
export function ComponentArt({ slug }: { slug: string }) {
  const body = art[slug]
  if (!body) {
    return null
  }
  return (
    <svg aria-hidden="true" className="componentArt" slot="media" viewBox="0 0 320 200">
      {body}
    </svg>
  )
}
