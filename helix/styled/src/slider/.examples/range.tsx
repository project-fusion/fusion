export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-slider
        default-value="20,70"
        label="Price"
        range
        show-value
      ></helix-slider>

      <helix-slider
        default-value="20,50,80"
        label="Fade stops"
        range
        show-value
        thumb-label="stop {index}"
      ></helix-slider>
    </helix-flex>
  )
}
