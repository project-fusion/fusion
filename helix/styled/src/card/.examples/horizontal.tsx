export function Example() {
  return (
    /* The orientation is what puts the picture down one side. Without it the
       card is the resting one, which stacks the media above the words, and this
       example was the preview again with a photograph in it. */
    <helix-card orientation="horizontal">
      <img
        alt=""
        slot="media"
        src="/media/scale/ocean-sun.jpg"
      />
      <h3>Quarterly review</h3>
      <p>What shipped, what slipped, and what it cost.</p>
    </helix-card>
  )
}
