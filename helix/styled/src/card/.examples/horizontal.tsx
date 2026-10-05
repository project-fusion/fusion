export function Example() {
  return (
    <helix-card
      aria-labelledby="review-title"
      orientation="horizontal"
    >
      <img
        alt=""
        slot="media"
        src="/media/scale/ocean-sun.jpg"
      />
      <h3 id="review-title">Quarterly review</h3>
      <p>Revenue, costs, and goals for the last three months.</p>
    </helix-card>
  )
}
