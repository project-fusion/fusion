export function Example() {
  return (
    <helix-card
      aria-labelledby="review-title"
      orientation="horizontal"
    >
      <helix-image
        alt=""
        slot="media"
        src="/media/scale/ocean-sun.jpg"
      ></helix-image>
      <helix-text
        as="h3"
        id="review-title"
      >
        Quarterly review
      </helix-text>
      <helix-text as="p">Revenue, costs, and goals for the last three months.</helix-text>
    </helix-card>
  )
}
