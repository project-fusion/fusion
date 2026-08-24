import styles from '../../app/(site)/insight-card.module.css'
import type { InsightImage } from '../../content/insights'

/**
 * The top of an insight card, where a post has brought one.
 *
 * **A card with no picture has no media region at all**, and that is the
 * resting state today: nothing in the registry carries an image, so every card
 * is its own type. A generated field stood here through three shapes, an `Aura`
 * per card, then painted gradients per topic, and the last of them made the
 * argument for stopping: keyed to topic rather than to the post, two pieces
 * filed under one subject drew the same picture. Decoration that cannot tell
 * two posts apart is decoration a reader learns to skip, and at four cards to a
 * row it was spending two hundred pixels of every card to do it.
 *
 * So the media is the picture or it is nothing. Returning `null` is what makes
 * that free: an unfilled slot renders no box, so `Card` closes up rather than
 * reserving a gap, and the day a post takes an image only that card changes.
 *
 * **One component decides, rather than each call site.** Both grids that render
 * a card would otherwise carry the same conditional, and the two would drift
 * the first time only one of them learned about a new case.
 *
 * `helix-image` rather than an `img`, which is the house rule and also the
 * useful answer here: it holds the box while the file is in flight, so an image
 * below the fold does not reflow the card it is in when it lands.
 *
 * `slot` is a declared prop rather than a spread, because React types an
 * intrinsic element's props from the element rather than from the component
 * around it: without it the attribute is refused at the call site and the
 * picture renders inside the card's inset like content.
 */
export function InsightArt({ image, slot }: { image?: InsightImage; slot?: string }) {
  if (!image) {
    return null
  }

  /* `lazy`, because every one of these is in a grid and none is the thing a
     reader came to the page for. The card's own header and title are what have
     to be there immediately. */
  return (
    <helix-image
      alt={image.alt}
      className={styles.insightPhoto}
      loading="lazy"
      slot={slot}
      src={image.src}
    ></helix-image>
  )
}
