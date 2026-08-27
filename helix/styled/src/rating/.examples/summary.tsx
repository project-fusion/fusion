export function Example() {
  return (
    <helix-flex direction="column" gap="sm">
      <helix-flex align="center" gap="sm">
        <helix-rating
          default-value="4.2"
          readonly
          show-value
          value-text="4.2 out of 5, from 318 reviews"
        ></helix-rating>
        <helix-text tone="muted">318 reviews</helix-text>
      </helix-flex>

      <helix-meter label="5 stars" show-value value={66}></helix-meter>
      <helix-meter label="4 stars" show-value value={19}></helix-meter>
      <helix-meter label="3 stars" show-value value={8}></helix-meter>
      <helix-meter label="2 stars" show-value value={4}></helix-meter>
      <helix-meter label="1 star" show-value value={3}></helix-meter>
    </helix-flex>
  )
}
