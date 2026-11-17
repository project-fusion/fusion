import './preview.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="none"
    >
      <helix-scroll-progress for="article"></helix-scroll-progress>
      <div
        className="article"
        id="article"
      >
        <helix-text>
          <p>Scroll this box and the bar above it fills.</p>
          <p>
            A long article reads better with a sense of how much is left, and the bar says it
            without a number.
          </p>
          <p>It follows the box its for attribute names, and the page when there is none.</p>
          <p>
            It moves under reduced motion too, as a scrollbar does, because it follows the reader's
            own hand.
          </p>
          <p>On paper it is hidden, since a printed page is not scrolled.</p>
        </helix-text>
      </div>
    </helix-flex>
  )
}
